import { Controller, Get, HttpCode } from '@nestjs/common';
import { PlaceRating, ReviewsService } from './reviews.service';

// GET /v1/ratings — anyone, no login. Every reviewed place's average stars
// and number of reviews, so the home page cards can show "★ 4.3 · 12
// reviews" (buttons & cards round). Read-only, worked out from the reviews
// table, which the backend's database login may already read.
@Controller('v1/ratings')
export class RatingsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Get()
  @HttpCode(200)
  findAll(): Promise<PlaceRating[]> {
    return this.reviewsService.ratings();
  }
}
