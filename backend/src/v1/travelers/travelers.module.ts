import { Module } from '@nestjs/common';
import { SupabaseModule } from '../../supabase/supabase.module';
import { ReviewPhotosService } from '../reviews/review-photos.service';
import { TravelersController } from './travelers.controller';
import { TravelersService } from './travelers.service';

// Traveler profiles (profiles & likes round). Reads only, through the
// backend's own database login; no Supabase Auth and no login needed.
// ReviewPhotosService reads each review's photos (up to 4, ticket 113)
// and turns them into public addresses.
@Module({
  imports: [SupabaseModule],
  controllers: [TravelersController],
  providers: [TravelersService, ReviewPhotosService],
})
export class TravelersModule {}
