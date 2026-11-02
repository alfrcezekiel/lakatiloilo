import { Logger, Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Destination } from '../entities/destination.entity';
import { Accommodation } from '../entities/accommodation.entity';
import { Review } from '../entities/review.entity';
import { ReviewLike } from '../entities/review-like.entity';
import { ReviewReply } from '../entities/review-reply.entity';
import { ReviewReport } from '../entities/review-report.entity';

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

// Opens the connection to the hosted Supabase Postgres database.
// Import this module once, in AppModule.
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        ssl: sslOptions(configService.get<string>('DATABASE_CA_CERT')),
        entities: [Destination, Accommodation, Review, ReviewLike, ReviewReply, ReviewReport],
        synchronize: false,
        // PostGIS is already installed by the SQL scripts; never try to
        // create extensions (the backend's lakat_api role is not allowed to).
        installExtensions: false,
        // Print every SQL query while developing, but not on Vercel, where
        // it would bury real errors in the logs.
        logging: configService.get<string>('NODE_ENV') !== 'production',
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule {}
