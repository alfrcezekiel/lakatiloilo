import { BadRequestException, Controller, Get, ParseUUIDPipe, Query } from '@nestjs/common';
import { PlaceType, ReviewsService } from './reviews.service';

const PLACE_TYPES: PlaceType[] = ['destination', 'accommodation'];

@Controller('v1/reviews')
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  // GET /v1/reviews?place_type=destination&place_id=<uuid>
  // A place's reviews, newest first. Anyone may call it.
  @Get()
  findForPlace(
    @Query('place_type') placeType: string,
    @Query('place_id', ParseUUIDPipe) placeId: string,
  ) {
    if (!PLACE_TYPES.includes(placeType as PlaceType)) {
      throw new BadRequestException('place_type must be "destination" or "accommodation".');
    }
    return this.reviewsService.findForPlace(placeType as PlaceType, placeId);
  }
}
