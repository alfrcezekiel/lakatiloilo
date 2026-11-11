import { type MiddlewareConsumer, Module, type NestModule, RequestMethod } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { SupabaseModule } from '../../supabase/supabase.module';
import { ReviewPhotosService } from '../reviews/review-photos.service';
import { TravelerTransactions } from '../traveler-transactions';
import { CategoriesModule } from '../categories/categories.module';
import { AdminCategoriesController } from './admin-categories.controller';
import { AdminController } from './admin.controller';
import { AdminOnlyMiddleware } from './admin-only.middleware';
import { AdminOverviewService } from './admin-overview.service';
import { AdminPhotoCreditsService } from './admin-photo-credits.service';
import { AdminPlacesService } from './admin-places.service';
import { PlacePhotosService } from './place-photos.service';
import { AdminReportsService } from './admin-reports.service';
import { AdminReviewsService } from './admin-reviews.service';
import { AdminService } from './admin.service';

// The Lakat Iloilo team's admin dashboard (admin dashboard & moderation
// round). Uses the traveler login (AuthService) and the admin check
// (AdminAccess) from AuthModule. Every admin endpoint except the sign-in
// goes through AdminOnlyMiddleware first (admins only).
@Module({
  imports: [AuthModule, SupabaseModule, CategoriesModule],
  controllers: [AdminController, AdminCategoriesController],
  providers: [
    AdminService,
    AdminOverviewService,
    AdminPlacesService,
    AdminPhotoCreditsService,
    PlacePhotosService,
    AdminReportsService,
    AdminReviewsService,
    ReviewPhotosService,
    TravelerTransactions,
  ],
})

export class AdminModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AdminOnlyMiddleware)
      .exclude({ path: 'v1/admin/login', method: RequestMethod.POST })
      .forRoutes(AdminController, AdminCategoriesController);
  }
}
