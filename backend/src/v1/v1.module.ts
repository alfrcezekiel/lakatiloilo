import { Module } from '@nestjs/common';
import { AccommodationsModule } from './accommodations/accommodations.module';
import { AuthModule } from './auth/auth.module';
import { DestinationsModule } from './destinations/destinations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { ReviewsModule } from './reviews/reviews.module';
import { TravelersModule } from './travelers/travelers.module';

@Module({
  imports: [
    DestinationsModule,
    AccommodationsModule,
    ReviewsModule,
    AuthModule,
    TravelersModule,
    NotificationsModule,
  ],
})
export class V1Module {}
