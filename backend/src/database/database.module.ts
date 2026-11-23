import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Destination } from '../entities/destination.entity';
import { Accommodation } from '../entities/accommodation.entity';
import { Review } from '../entities/review.entity';
import { ReviewLike } from '../entities/review-like.entity';
import { ReviewReply } from '../entities/review-reply.entity';
import { ReviewReport } from '../entities/review-report.entity';
import { ReplyLike } from '../entities/reply-like.entity';

// Supabase signs its database certificates with its own root CA, which
// Node does not trust by default. With DATABASE_CA_CERT set (the contents of
// the certificate from Supabase -> Database settings -> SSL), the connection
// is verified: the backend checks it is really talking to Supabase. Without
// it, the connection is still encrypted but not verified.
const sslOptions = (caCert?: string) => {
  if (caCert) {
    // Vercel keeps real line breaks; some tools save them as "\n" text.
    const pem = caCert.replace(/\\n/g, '\n').trim();
    // A .env value only spans several lines inside double quotes. Without
    // them, only "-----BEGIN CERTIFICATE-----" is read, and the connection
    // later fails with the confusing "self-signed certificate in
    // certificate chain". Catch that here with a message that says why.
    if (
      !pem.startsWith('-----BEGIN CERTIFICATE-----') ||
      !pem.endsWith('-----END CERTIFICATE-----')
    ) {
      throw new Error(
        'DATABASE_CA_CERT is incomplete: it must run from -----BEGIN CERTIFICATE----- ' +
          'to -----END CERTIFICATE-----. In backend/.env, wrap the whole ' +
          'certificate in double quotes.',
      );
    }
    return { ca: pem, rejectUnauthorized: true };
  }
  new Logger('DatabaseModule').warn(
    'DATABASE_CA_CERT is not set: the database connection is encrypted but not verified.',
  );
  return { rejectUnauthorized: false };
};

// How many database connections the backend keeps open at once (its
// "pool"). Every request borrows one, so this caps how many database
// questions run at the same time; the rest wait in line.
//
// Default 20 (team decision, 2026-11-18). node-postgres' own default is 10,
// and a k6 stress test showed that was the bottleneck: with 150 travelers at
// once, answers took 2.1 s (p95) on 10 connections and 0.3 s on 20, with no
// other change (docs/evaluations/2026-11-17-k6.md).
//
// DATABASE_POOL_MAX (backend/.env.local) overrides it locally, 1 to 50.
//
// On Vercel it is always 3 per running copy (team request 2026-11-24). Many
// copies can run at once, so 20 each could use up Supabase's connections.
const DEFAULT_POOL_MAX = 20;
const SERVERLESS_POOL_MAX = 3;
const poolMax = (value?: string) => {
  if (process.env.VERCEL) return SERVERLESS_POOL_MAX;
  const max = Number(value);
  return Number.isInteger(max) && max >= 1 && max <= 50 ? max : DEFAULT_POOL_MAX;
};

// Opens the connection to the hosted Supabase Postgres database.
// Import this module once, in AppModule.
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => {
        const max = poolMax(configService.get<string>('DATABASE_POOL_MAX'));
        new Logger('DatabaseModule').log(`Database pool: up to ${max} connections at once.`);
        return {
          type: 'postgres' as const,
          url: configService.get<string>('DATABASE_URL'),
          ssl: sslOptions(configService.get<string>('DATABASE_CA_CERT')),
          extra: { max },
          // Give up quickly if the database is down, so a request is not
          // left waiting through many slow retries.
          retryAttempts: 2,
          retryDelay: 1000,
          entities: [Destination, Accommodation, Review, ReviewLike, ReviewReply, ReviewReport, ReplyLike],
          // Off in every environment. Entities only describe tables that
          // already exist: the schema is managed by the Supabase CLI
          // migrations in supabase/migrations (see CLAUDE.md, Database changes).
          synchronize: false,
          migrationsRun: false,
          // PostGIS is already installed by the SQL scripts; never try to
          // create extensions (the backend's lakat_api role is not allowed to).
          installExtensions: false,
          // Print every SQL query while developing, but not on staging or
          // production, where it would bury real errors in the logs.
          logging: configService.get<string>('APP_ENV') === 'local',
        };
      },
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
