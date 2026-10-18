import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Destination } from '../entities/destination.entity';
import { Accommodation } from '../entities/accommodation.entity';

// Opens the connection to the hosted Supabase Postgres database.
// Import this module once, in AppModule.
@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      useFactory: (configService: ConfigService) => ({
        type: 'postgres',
        url: configService.get<string>('DATABASE_URL'),
        ssl: {
          rejectUnauthorized: false
        },
        entities: [Destination, Accommodation],
        synchronize: false,
        logging: true,
      }),
      inject: [ConfigService],
    }),
  ],
})
export class DatabaseModule { }
