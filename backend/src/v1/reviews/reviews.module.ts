import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '../../entities/review.entity';
import { ReviewLike } from '../../entities/review-like.entity';
import { ReviewReply } from '../../entities/review-reply.entity';
import { TravelerTransactions } from '../traveler-transactions';
import { RepliesController } from './replies.controller';
import { RepliesService } from './replies.service';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ReviewPhotosService } from './review-photos.service';
import { SupabaseModule } from '../../supabase/supabase.module';
import { RatingsController } from './ratings.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([Review, ReviewLike, ReviewReply]), SupabaseModule],
  controllers: [ReviewsController, RatingsController, RepliesController, ReportsController],
  providers: [ReviewsService, RepliesService, ReportsService, ReviewPhotosService, TravelerTransactions],
})
export class ReviewsModule {}
