import { Module } from '@nestjs/common';
import { AccommodationsModule } from './accommodations/accommodations.module';
import { DestinationsModule } from './destinations/destinations.module';
import { ReviewsModule } from './reviews/reviews.module';

@Module({
  imports: [DestinationsModule, AccommodationsModule, ReviewsModule],
})
export class V1Module {}
