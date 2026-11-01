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
} from '@nestjs/common';
import { loginToken } from '../login-token';
import { NewReview, PlaceType, ReviewChanges, ReviewsService } from './reviews.service';

const PLACE_TYPES: PlaceType[] = ['destination', 'accommodation'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

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
  // A place's reviews, newest first, each with its "Helpful" count. Anyone
  // may call it. With a login (Authorization: Bearer <token>) each review
  // also says whether this traveler marked it (liked_by_me); without one,
  // or with an expired one, liked_by_me is false.
  @Get()
  @HttpCode(200)
  async findForPlace(
    @Headers('authorization') authorization: string | undefined,
    @Query('place_type') placeType: string,
    @Query('place_id', ParseUUIDPipe) placeId: string,
  ) {
    if (!PLACE_TYPES.includes(placeType as PlaceType)) {
      throw new BadRequestException('place_type must be "destination" or "accommodation".');
    }
    const viewerId = await this.reviewsService.viewerIdFor(authorization);
    return this.reviewsService.findForPlace(placeType as PlaceType, placeId, viewerId);
  }

  // POST /v1/reviews/<id>/like   (header: Authorization: Bearer <login token>)
  // Marks someone else's review as helpful. Answers 200 with
  // { helpful_count, liked: true }. Refusals: 401 not logged in, 404 no
  // such review, 400 "You can't mark your own review as helpful."
  @Post(':id/like')
  @HttpCode(200)
  like(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviewsService.like(loginToken(authorization), id);
  }

  // DELETE /v1/reviews/<id>/like   (header: Authorization: Bearer <login token>)
  // Removes the traveler's own like. Answers 200 with
  // { helpful_count, liked: false }.
  @Delete(':id/like')
  @HttpCode(200)
  unlike(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviewsService.unlike(loginToken(authorization), id);
  }

  // POST /v1/reviews   (header: Authorization: Bearer <login token>)
  // body: { place_type, place_id, rating, comment }
  // Adds the logged-in traveler's review and answers with it.
  @Post()
  @HttpCode(201)
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
  @HttpCode(200)
  update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: Partial<ReviewChanges> | undefined,
  ) {
    return this.reviewsService.update(loginToken(authorization), id, starsAndComment(body));
  }

  // DELETE /v1/reviews/<id>   (header: Authorization: Bearer <login token>)
  // Deletes the traveler's own review. Answers 200 with
  // { id, message: "Your review has been deleted." }, so the website can
  // show the backend's own message.
  @Delete(':id')
  @HttpCode(200)
  remove(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', ParseUUIDPipe) id: string,
  ) {
    return this.reviewsService.remove(loginToken(authorization), id);
  }
}
