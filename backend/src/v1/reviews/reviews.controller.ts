import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { NewReview, PlaceType, ReviewChanges, ReviewsService } from './reviews.service';

const PLACE_TYPES: PlaceType[] = ['destination', 'accommodation'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The traveler's login token, from "Authorization: Bearer <token>".
const loginToken = (authorization?: string) => {
  const token = authorization?.match(/^Bearer (.+)$/)?.[1];
  if (!token) throw new UnauthorizedException('Please log in to write a review.');
  return token;
};

// Stars 1 to 5 and a comment of 1 to 500 characters (trimmed). These
// checks give friendly messages; the database checks everything again.
const starsAndComment = (body: Partial<ReviewChanges> | undefined): ReviewChanges => {
  const rating = body?.rating;
  const comment = typeof body?.comment === 'string' ? body.comment.trim() : '';
  if (
    typeof rating !== 'number' ||
    !Number.isInteger(rating) ||
    rating < 1 ||
    rating > 5 ||
    comment.length < 1 ||
    comment.length > 500
  ) {
    throw new BadRequestException('Please pick 1 to 5 stars and write 1 to 500 characters.');
  }
  return { rating, comment };
};

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

  // POST /v1/reviews   (header: Authorization: Bearer <login token>)
  // body: { place_type, place_id, rating, comment }
  // Adds the logged-in traveler's review and answers with it.
  @Post()
  create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: Partial<NewReview> | undefined,
  ) {
    const token = loginToken(authorization);
    const placeType = body?.place_type;
    const placeId = body?.place_id;
    if (!PLACE_TYPES.includes(placeType as PlaceType) || typeof placeId !== 'string' || !UUID.test(placeId)) {
      throw new BadRequestException('Please choose a destination or accommodation to review.');
    }
    // Only these four fields are sent on: who wrote it, their name and
    // the dates are filled in by the database.
    return this.reviewsService.create(token, {
      place_type: placeType as PlaceType,
      place_id: placeId,
      ...starsAndComment(body),
    });
  }

  // PATCH /v1/reviews/<id>   (header: Authorization: Bearer <login token>)
  // body: { rating, comment }
  // Changes the stars and comment of the traveler's own review.
  @Patch(':id')
  update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<ReviewChanges> | undefined,
  ) {
    return this.reviewsService.update(loginToken(authorization), id, starsAndComment(body));
  }

  // DELETE /v1/reviews/<id>   (header: Authorization: Bearer <login token>)
  // Deletes the traveler's own review. Answers 204 (done, nothing to send).
  @Delete(':id')
  @HttpCode(204)
  remove(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviewsService.remove(loginToken(authorization), id);
  }
}
