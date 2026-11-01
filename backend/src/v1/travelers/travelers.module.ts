import { Module } from '@nestjs/common';
import { TravelersController } from './travelers.controller';
import { TravelersService } from './travelers.service';

// Traveler profiles (profiles & likes round). Reads only, through the
// backend's own database login; no Supabase Auth and no login needed.
@Module({
  controllers: [TravelersController],
  providers: [TravelersService],
})
export class TravelersModule {}
