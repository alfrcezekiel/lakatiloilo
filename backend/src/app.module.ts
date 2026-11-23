import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { hostProvidesEnv, validateEnv } from './config/env.validation';
import { DatabaseModule } from './database/database.module';
import { V1Module } from './v1/v1.module';
import { V2Module } from './v2/v2.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Local development reads backend/.env.local. Staging and production
      // read only the variables set on their host.
      envFilePath: '.env.local',
      ignoreEnvFile: hostProvidesEnv(),
      validate: validateEnv,
    }),
    // A global limit per caller. It is generous because website traffic
    // reaches the backend through a few shared Vercel server addresses, so
    // many travelers can count as one caller.
    ThrottlerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        throttlers: [{ ttl: 60_000, limit: Number(config.getOrThrow<string>('RATE_LIMIT_PER_MINUTE')) }],
        errorMessage: 'Too many requests. Please wait a minute and try again.',
      }),
    }),
    DatabaseModule,
    V1Module,
    V2Module,
  ],
  controllers: [AppController],
  providers: [AppService, { provide: APP_GUARD, useClass: ThrottlerGuard }],
})
export class AppModule {}
