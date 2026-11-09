import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { QueryFailedError, type QueryRunner } from 'typeorm';
import { TravelerTransactions } from '../traveler-transactions';
import {
  MAX_PHOTOS,
  ReviewPhotosService,
  TOO_MANY_PHOTOS,
  type ReviewPhotoDto,
  type UploadedPhoto,
} from './review-photos.service';
import { notYours } from './reviews.service';

const photoNotFound = () => new NotFoundException("We couldn't find that photo.");

// Adding and removing a review's photos (ticket 113), as the logged-in
// traveler, so Row Level Security and the review_photos trigger decide
// (supabase/sql/044): only the review's writer, only into their own
// Storage folder, at most 4. Moved out of ReviewsService in the code
// review of 2026-11-09, so reviews, likes and photo uploads each have
// their own place.
@Injectable()
export class ReviewPhotoUploadsService {
  private readonly logger = new Logger(ReviewPhotoUploadsService.name);

  constructor(
    private readonly travelerTransactions: TravelerTransactions,
    private readonly photos: ReviewPhotosService,
  ) {}

  private asTraveler<T>(accessToken: string, work: (runner: QueryRunner) => Promise<T>): Promise<T> {
    return this.travelerTransactions.run(accessToken, work, (error) => this.toHttpError(error));
  }

  // Adds one photo to the traveler's own review (POST
  // /v1/reviews/:id/photos, ticket 113). One photo per request, because
  // four 2 MB photos together would go over Vercel's 4.5 MB request limit.
  //   1. The photo is checked (type from its first bytes, size), and the
  //      review must be theirs and have fewer than 4 photos.
  //   2. It is uploaded into their own Storage folder.
  //   3. The row is added; the database checks again (the writer only, own
  //      folder, at most 4, supabase/sql/044). If that fails, the file is
  //      deleted again, so no unused file is left behind.
  async add(accessToken: string, reviewId: string, photo: UploadedPhoto): Promise<ReviewPhotoDto> {
    this.photos.check(photo);
    await this.asTraveler(accessToken, async (runner) => {
      const [review]: { photos: number }[] = await runner.query(
        `select (select count(*)::int from public.review_photos p where p.review_id = r.id) as photos
           from public.reviews r
          where r.id = $1 and r.user_id = auth.uid()`,
        [reviewId],
      );
      if (!review) throw notYours();
      if (review.photos >= MAX_PHOTOS) throw new BadRequestException(TOO_MANY_PHOTOS);
    });
    const path = await this.photos.upload(accessToken, photo);
    try {
      return await this.asTraveler(accessToken, async (runner) => {
        const [row]: { id: string; position: number }[] = await runner.query(
          `insert into public.review_photos (review_id, photo_path)
              values ($1, $2)
              returning id, position`,
          [reviewId, path],
        );
        const photos = await this.photos.photosFor(runner, [reviewId]);
        const saved = photos.get(reviewId)?.find((p) => p.id === row.id);
        if (!saved) throw photoNotFound();
        return saved;
      });
    } catch (error) {
      await this.photos.remove(accessToken, path);
      throw error;
    }
  }

  // Removes one photo from the traveler's own review (DELETE
  // /v1/reviews/:id/photos/:photoId, ticket 113), then deletes the file.
  // Row Level Security only lets the writer remove it, so someone else's
  // photo is simply "not found". While the old single-photo column (027)
  // still exists, it is cleared too when it points at this file, so the
  // later clean-up file cannot bring the photo back.
  async remove(accessToken: string, reviewId: string, photoId: string): Promise<{ id: string }> {
    const path = await this.asTraveler(accessToken, async (runner) => {
      const [rows]: [{ photo_path: string }[], number] = await runner.query(
        'delete from public.review_photos where id = $1 and review_id = $2 returning photo_path',
        [photoId, reviewId],
      );
      if (rows.length === 0) throw photoNotFound();
      await runner.query(
        `update public.reviews set photo_path = null
          where id = $1 and user_id = auth.uid() and photo_path = $2`,
        [reviewId, rows[0].photo_path],
      );
      return rows[0].photo_path;
    });
    await this.photos.remove(accessToken, path);
    return { id: photoId };
  }

  // Turns a database refusal into a plain answer.
  private toHttpError(error: unknown) {
    if (error instanceof HttpException) return error;
    const code =
      error instanceof QueryFailedError
        ? (error.driverError as { code?: string } | undefined)?.code
        : undefined;
    switch (code) {
      // A 5th photo (the review_photos trigger, 044).
      case '23514':
        return new BadRequestException(TOO_MANY_PHOTOS);
      // The review was deleted meanwhile.
      case '23503':
        return notYours();
      // Not the writer, or not their own folder.
      case '42501':
        return new UnauthorizedException('Please log in again, then try again.');
    }
    this.logger.error(`Could not save a review photo: ${String(error)}`);
    return new ServiceUnavailableException('Something went wrong. Please try again.');
  }
}
