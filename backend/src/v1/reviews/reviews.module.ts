import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Review } from '../../entities/review.entity';
import { ReviewLike } from '../../entities/review-like.entity';
import { SupabaseModule } from '../../supabase/supabase.module';
import { RatingsController } from './ratings.controller';
import { ReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([Review, ReviewLike]), SupabaseModule],
  controllers: [ReviewsController, RatingsController],
  providers: [ReviewsService],
})
export class ReviewsModule {}
