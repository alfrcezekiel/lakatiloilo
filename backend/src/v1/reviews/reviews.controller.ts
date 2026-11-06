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
import { ReviewPhotosService, type UploadedPhoto } from './review-photos.service';
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
    private readonly photos: ReviewPhotosService,
  ) {}

  // What the website gets for a review: the photo's public address
  // (photo_url) instead of where it is kept in Storage (photo_path).
  private withPhotoUrl<T extends { photo_path?: string | null }>(review: T) {
    const { photo_path: photoPath, ...rest } = review;
    return { ...rest, photo_url: this.photos.urlFor(photoPath) };
  }

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
    @Query('place_id', placeIdQuery()) placeId: string,
  ) {
    if (!PLACE_TYPES.includes(placeType as PlaceType)) {
      throw new BadRequestException('place_type must be "destination" or "accommodation".');
    }
    const viewerId = await this.reviewsService.viewerIdFor(authorization);
    const reviews = await this.reviewsService.findForPlace(placeType as PlaceType, placeId, viewerId);
    // Each review's replies, oldest first (review extras round, ticket 79),
    // with their Helpful counts (ticket 96).
    const replies = await this.repliesService.forReviews(
      reviews.map((r) => r.id),
      viewerId,
    );
    return reviews.map((review) => ({
      ...this.withPhotoUrl(review),
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
  // body: { place_type, place_id, rating, comment } as JSON, or the same as
  // form fields plus one optional file field "photo" (JPG, PNG or WebP, up
  // to 2 MB; ticket 81). Adds the logged-in traveler's review and answers
  // with it, including photo_url. A wrong photo: 400 "Please choose a JPG,
  // PNG or WebP photo up to 2 MB." The upload handling keeps the file in
  // memory and stops reading past 4 MB (Vercel refuses requests over
  // 4.5 MB anyway).
  @Post()
  @HttpCode(201)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 4 * 1024 * 1024, files: 1 } }))
  @UseFilters(PhotoTooLargeFilter)
  async create(
    @Headers('authorization') authorization: string | undefined,
    @Body() body: Partial<Record<keyof NewReview, unknown>> | undefined,
    @UploadedFile() photo: UploadedPhoto | undefined,
  ) {
    const token = loginToken(authorization);
    const placeType = body?.place_type;
    const placeId = body?.place_id;
    if (!PLACE_TYPES.includes(placeType as PlaceType) || typeof placeId !== 'string' || !UUID.test(placeId)) {
      throw new BadRequestException('Please choose a destination or accommodation to review.');
    }
    const fields = starsAndComment(body);
    // Check the photo before anything is saved, so a wrong file changes
    // nothing.
    if (photo) this.photos.check(photo);
    // Only these fields are sent on: who wrote it, their name and the dates
    // are filled in by the database.
    const saved = await this.reviewsService.create(
      token,
      { place_type: placeType as PlaceType, place_id: placeId, ...fields },
      photo,
    );
    return this.withPhotoUrl(saved);
  }

  // PATCH /v1/reviews/<id>   (header: Authorization: Bearer <login token>)
  // body: { rating, comment, remove_photo? } as JSON, or the same as form
  // fields plus one optional file field "photo" (ticket 82). Changes the
  // stars and comment of the traveler's own review; a new photo replaces
  // the old one, remove_photo: true removes it, and with neither the photo
  // stays. Same photo limits and message as POST.
  @Patch(':id')
  @HttpCode(200)
  @UseInterceptors(FileInterceptor('photo', { limits: { fileSize: 4 * 1024 * 1024, files: 1 } }))
  @UseFilters(PhotoTooLargeFilter)
  async update(
    @Headers('authorization') authorization: string | undefined,
    @Param('id', idOf('review')) id: string,
    @Body() body: (Partial<Record<keyof ReviewChanges, unknown>> & { remove_photo?: unknown }) | undefined,
    @UploadedFile() photo: UploadedPhoto | undefined,
  ) {
    const token = loginToken(authorization);
    const fields = starsAndComment(body);
    // Check the photo before anything is saved, so a wrong file changes
    // nothing. A form field arrives as text, so "true" counts too.
    if (photo) this.photos.check(photo);
    const removePhoto = body?.remove_photo === true || body?.remove_photo === 'true';
    const saved = await this.reviewsService.update(token, id, fields, { photo, removePhoto });
    return this.withPhotoUrl(saved);
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
