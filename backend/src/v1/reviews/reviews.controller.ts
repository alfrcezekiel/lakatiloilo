import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  HttpCode,
  Param,
  Patch,
  Post,
  Query,
  UploadedFile,
  UseFilters,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { loginToken } from '../login-token';
import { NewReview, PlaceType, ReviewChanges, ReviewsService } from './reviews.service';
import { RepliesService } from './replies.service';
import { PhotoTooLargeFilter } from './photo-too-large.filter';
import { PHOTO_MESSAGE, type UploadedPhoto } from './review-photos.service';
import { idOf, placeIdQuery } from '../id-param';

const PLACE_TYPES: PlaceType[] = ['destination', 'accommodation'];
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Stars 1 to 5 and a comment of 1 to 500 characters (trimmed). These
// checks give friendly messages; the database checks everything again.
// A review sent with a photo arrives as form fields, where every value is
// text ("4"), so a whole-number rating written as text is accepted too.
const starsAndComment = (body: Partial<Record<keyof ReviewChanges, unknown>> | undefined): ReviewChanges => {
  const rating =
    typeof body?.rating === 'string' && /^\d+$/.test(body.rating) ? Number(body.rating) : body?.rating;
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
  constructor(
    private readonly reviewsService: ReviewsService,
    private readonly repliesService: RepliesService,
  ) {}

  // GET /v1/reviews?place_type=destination&place_id=<uuid>
  // A place's reviews, newest first, each with its "Helpful" count. Anyone
  // may call it. With a login (Authorization: Bearer <token>) each review
  // also says whether this traveler marked it (liked_by_me); without one,
  // or with an expired one, liked_by_me is false. Reviews the team hid are
  // left out, except the traveler's own, which comes back with
  // hidden: true (ticket 109).
  @Get()
  @HttpCode(200)
  async findForPlace(
    @Headers('authorization') authorization: string | undefined,
    @Query('place_type') placeType: string,
    @Query('place_id', placeIdQuery()) placeId: string,
  ) {
    if (!PLACE_TYPES.includes(placeType as PlaceType)) {
      throw new BadRequestException('place_type must be "destination" or "accommodation".');
    }
    const viewerId = await this.reviewsService.viewerIdFor(authorization);
    const visible = await this.reviewsService.findForPlace(placeType as PlaceType, placeId, viewerId);
    // The traveler's own review, if the team hid it (ticket 109): only they
    // get it back, marked hidden, so the page can say "Hidden while the team
    // reviews it." Everyone else never receives hidden reviews.
    const token = authorization?.match(/^Bearer (.+)$/)?.[1];
    const ownHidden =
      viewerId && token
        ? await this.reviewsService.ownHiddenForPlace(token, placeType as PlaceType, placeId)
        : [];
    const reviews = [
      ...visible.map((review) => ({ ...review, hidden: false })),
      ...ownHidden.map((review) => ({ ...review, hidden: true })),
    ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    // Each review's replies, oldest first (review extras round, ticket 79),
    // with their Helpful counts (ticket 96).
    const replies = await this.repliesService.forReviews(
      reviews.map((r) => r.id),
      viewerId,
    );
    return reviews.map((review) => ({
      ...review,
      replies: replies.get(review.id) ?? [],
    }));
  }

  // POST /v1/reviews/<id>/like   (header: Authorization: Bearer <login token>)
  // Marks someone else's review as helpful. Answers 200 with
  // { helpful_count, liked: true }. Refusals: 401 not logged in, 404 no
  // such review, 400 "You can't mark your own review as helpful."
  @Post(':id/like')
  @HttpCode(200)
  like(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
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
    @Param('id', idOf('review')) id: string,
  ) {
    return this.reviewsService.unlike(loginToken(authorization), id);
  }

  // POST /v1/reviews   (header: Authorization: Bearer <login token>)
  // body: { place_type, place_id, rating, comment } as JSON. Adds the
  // logged-in traveler's review and answers with it (photos: []). Photos
  // are sent afterwards, one per request, to POST /v1/reviews/:id/photos
  // (ticket 113).
  @Post()
  @HttpCode(201)
  create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: Partial<Record<keyof NewReview, unknown>> | undefined,
  ) {
    const token = loginToken(authorization);
    const placeType = body?.place_type;
    const placeId = body?.place_id;
    if (!PLACE_TYPES.includes(placeType as PlaceType) || typeof placeId !== 'string' || !UUID.test(placeId)) {
      throw new BadRequestException('Please choose a destination or accommodation to review.');
    }
    const fields = starsAndComment(body);
    // Only these fields are sent on: who wrote it, their name and the dates
    // are filled in by the database.
    return this.reviewsService.create(token, {
      place_type: placeType as PlaceType,
      place_id: placeId,
      ...fields,
    });
  }

  // PATCH /v1/reviews/<id>   (header: Authorization: Bearer <login token>)
  // body: { rating, comment } as JSON. Changes the stars and comment of the
  // traveler's own review and answers with it and its photos. Photos are
  // added and removed with the two endpoints below (ticket 113).
  @Patch(':id')
  @HttpCode(200)
  update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
    @Body() body: Partial<Record<keyof ReviewChanges, unknown>> | undefined,
  ) {
    return this.reviewsService.update(loginToken(authorization), id, starsAndComment(body));
  }

  // POST /v1/reviews/<id>/photos   (header: Authorization: Bearer <login token>)
  // One file field "photo" (JPG, PNG or WebP, up to 2 MB; ticket 113).
  // Adds it to the traveler's own review and answers { id, url, position }.
  // Refusals: 400 "Please choose a JPG, PNG or WebP photo up to 2 MB.",
  // 400 "A review can have up to 4 photos.", 404 not their review. The
  // upload handling keeps the file in memory and stops reading past 4 MB
  // (Vercel refuses requests over 4.5 MB anyway).
  @Post(':id/photos')
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 4 * 1024 * 1024, files: 1 } }))
  @UseFilters(PhotoTooLargeFilter)
  addPhoto(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
    @UploadedFile() photo: UploadedPhoto | undefined,
  ) {
    const token = loginToken(authorization);
    if (!photo) throw new BadRequestException(PHOTO_MESSAGE);
    return this.reviewsService.addPhoto(token, id, photo);
  }

  // DELETE /v1/reviews/<id>/photos/<photo id>   (header: Authorization: Bearer <login token>)
  // Removes one photo from the traveler's own review and deletes the file.
  // Answers 200 { id }; 404 "We couldn't find that photo." otherwise.
  @Delete(':id/photos/:photoId')
  @HttpCode(200)
  removePhoto(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
    @Param('photoId', idOf('photo')) photoId: string,
  ) {
    return this.reviewsService.removePhoto(loginToken(authorization), id, photoId);
  }

  // DELETE /v1/reviews/<id>   (header: Authorization: Bearer <login token>)
  // Deletes the traveler's own review. Answers 200 with
  // { id, message: "Your review has been deleted." }, so the website can
  // show the backend's own message.
  @Delete(':id')
  @HttpCode(200)
  remove(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
  ) {
    return this.reviewsService.remove(loginToken(authorization), id);
  }
}
