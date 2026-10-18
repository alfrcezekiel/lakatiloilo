import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { DatabaseModule } from './database/database.module';
import { V1Module } from './v1/v1.module';
import { V2Module } from './v2/v2.module';
import { Destination } from './entities/destination.entity';
import { Accommodation } from './entities/accommodation.entity';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule,
    TypeOrmModule.forFeature([Destination, Accommodation]),
    V1Module,
    V2Module,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
