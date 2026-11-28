import { Module } from '@nestjs/common';
import { AccommodationsModule } from './accommodations/accommodations.module';
import { AdminModule } from './admin/admin.module';
import { AuthModule } from './auth/auth.module';
import { CategoriesModule } from './categories/categories.module';
import { PhotoCreditsModule } from './photo-credits/photo-credits.module';
import { FaqsModule } from './faqs/faqs.module';
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
    AdminModule,
    CategoriesModule,
    PhotoCreditsModule,
    FaqsModule,
  ],
})
export class V1Module {}
