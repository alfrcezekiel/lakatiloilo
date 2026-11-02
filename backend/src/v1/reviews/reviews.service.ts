import {
  BadRequestException,
  ConflictException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { QueryFailedError, QueryRunner, Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { ReviewLike, helpfulCountOf } from '../../entities/review-like.entity';
import { SupabaseService } from '../../supabase/supabase.service';
import { TravelerTransactions } from '../traveler-transactions';
import { ReviewPhotosService, type UploadedPhoto } from './review-photos.service';

// What the website gets for each review. Only the display name is ever
// sent, never the reviewer's email (the reviews table does not hold it).
export type ReviewDto = Pick<
  Review,
  'id' | 'user_id' | 'reviewer_name' | 'traveler_type' | 'rating' | 'comment' | 'photo_path' | 'created_at'
>;

export type PlaceType = 'destination' | 'accommodation';

// What a traveler sends to add a review. Who wrote it, their name and the
// dates are filled in by the database, never by the request.
export interface NewReview {
  place_type: PlaceType;
  place_id: string;
  rating: number;
  comment: string;
}

// What a traveler may change in their own review: only the stars and the
// comment (the "grant update" line in supabase/sql/020).
export interface ReviewChanges {
  rating: number;
  comment: string;
}

// One place's rating, for the home page cards.
export interface PlaceRating {
  place_type: PlaceType;
  place_id: string;
  average_rating: number;
  review_count: number;
}

// What the website gets after deleting a review.
export interface DeletedReview {
  id: string;
  message: string;
}

const COLUMNS = 'id, user_id, reviewer_name, traveler_type, rating, comment, photo_path, created_at';

// A review as GET /v1/reviews sends it: the review, plus its "Helpful"
// count and whether the traveler asking marked it (profiles & likes round).
export type ReviewWithLikes = ReviewDto & { helpful_count: number; liked_by_me: boolean };

// What the website gets after marking or unmarking a review as helpful.
export interface LikeState {
  helpful_count: number;
  liked: boolean;
}

const reviewNotFound = () => new NotFoundException("We couldn't find that review.");

// How many travelers found a review helpful, counted inside the same
// transaction (runner.manager), so the answer includes the like just added
// or removed.
const helpfulCount = (runner: QueryRunner, reviewId: string) =>
  runner.manager.count(ReviewLike, { where: { review_id: reviewId } });

const notYours = () =>
  new NotFoundException("We couldn't find that review among yours. Please log in again and try.");

// Reads and writes the reviews table with TypeORM, through the backend's
// own database login (lakat_api, see supabase/sql/016 and 023).
@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    private readonly travelerTransactions: TravelerTransactions,
    private readonly photos: ReviewPhotosService,
    private readonly supabase: SupabaseService,
  ) { }

  // A place's reviews, newest first. Anyone may read them. Each review also
  // says how many travelers found it helpful, and (when the request carries
  // a valid login) whether this traveler did (profiles & likes round). Read
  // through lakat_api, which may read reviews and likes (023 and 024).
  //
  // Built with TypeORM's query builder (likes on TypeORM round, ticket 77):
  // the two like columns are small sub-queries on the ReviewLike entity, so
  // it is still one database request. Every value (place, viewer) travels
  // as a named parameter, never glued into the SQL text. When viewerId is
  // null, no like matches it, so liked_by_me is simply false.
  async findForPlace(
    placeType: PlaceType,
    placeId: string,
    viewerId: string | null = null,
  ): Promise<ReviewWithLikes[]> {
    try {
      return await this.reviews
        .createQueryBuilder('r')
        .select('r.id', 'id')
        .addSelect('r.user_id', 'user_id')
        .addSelect('r.reviewer_name', 'reviewer_name')
        .addSelect('r.traveler_type', 'traveler_type')
        .addSelect('r.rating', 'rating')
        .addSelect('r.comment', 'comment')
        .addSelect('r.photo_path', 'photo_path')
        .addSelect('r.created_at', 'created_at')
        .addSelect(helpfulCountOf('r'), 'helpful_count')
        .addSelect(
          (mine) =>
            mine
              .select('COUNT(*) > 0')
              .from(ReviewLike, 'm')
              .where('m.review_id = r.id')
              .andWhere('m.user_id = CAST(:viewerId AS uuid)'),
          'liked_by_me',
        )
        .where('r.place_type = :placeType', { placeType })
        .andWhere('r.place_id = :placeId', { placeId })
        .setParameter('viewerId', viewerId)
        .orderBy('r.created_at', 'DESC')
        .getRawMany<ReviewWithLikes>();
    } catch (error) {
      this.logger.error(`Could not read reviews: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load reviews right now.');
    }
  }

  // Every reviewed place's average stars and number of reviews, for the
  // home page cards (GET /v1/ratings, buttons & cards round). Anyone may
  // read them: they come from the same reviews everyone can already read.
  // Places with no reviews are simply not in the list.
  async ratings(): Promise<PlaceRating[]> {
    try {
      const rows = await this.reviews
        .createQueryBuilder('review')
        .select('review.place_type', 'place_type')
        .addSelect('review.place_id', 'place_id')
        .addSelect('AVG(review.rating)', 'average_rating')
        .addSelect('COUNT(*)', 'review_count')
        .groupBy('review.place_type')
        .addGroupBy('review.place_id')
        .getRawMany<{ place_type: PlaceType; place_id: string; average_rating: string; review_count: string }>();
      // Postgres answers AVG and COUNT as text, so turn them into numbers.
      return rows.map((row) => ({
        place_type: row.place_type,
        place_id: row.place_id,
        average_rating: Number(row.average_rating),
        review_count: Number(row.review_count),
      }));
    } catch (error) {
      this.logger.error(`Could not read ratings: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load ratings right now.');
    }
  }

  // Runs `work` as the traveler whose login token this is, so Row Level
  // Security decides (see TravelerTransactions in v1/traveler-transactions.ts,
  // shared with replies since ticket 79). Errors become this service's plain
  // messages (toHttpError below).
  private asTraveler<T>(accessToken: string, work: (runner: QueryRunner) => Promise<T>): Promise<T> {
    return this.travelerTransactions.run(accessToken, work, (error) => this.toHttpError(error));
  }

  // Adds a review. The database fills in user_id, reviewer_name and the
  // dates itself. The values travel separately from the SQL text ($1 to
  // $4), so what a traveler types can never change the query.
  //
  // With a photo (ticket 81): the photo is uploaded first, into the
  // traveler's own folder, and its place is saved with the review
  // (photo_path, $5). If saving the review then fails, the photo is deleted
  // again, so no unused file is left behind.
  async create(accessToken: string, review: NewReview, photo?: UploadedPhoto): Promise<ReviewDto> {
    const photoPath = photo ? await this.photos.upload(accessToken, photo) : null;
    try {
      return await this.asTraveler(accessToken, async (runner) => {
        const rows: ReviewDto[] = await runner.query(
          `insert into public.reviews (place_type, place_id, rating, comment, photo_path)
              values ($1, $2, $3, $4, $5)
              returning ${COLUMNS}`,
          [review.place_type, review.place_id, review.rating, review.comment, photoPath],
        );
        return rows[0];
      });
    } catch (error) {
      if (photoPath) await this.photos.remove(accessToken, photoPath);
      throw error;
    }
  }

  // Changes the stars and comment of the traveler's own review. Row Level
  // Security hides everyone else's reviews, so for someone else's review
  // (or one that no longer exists) nothing is changed and the answer is
  // "not found among yours".
  //
  // The photo (ticket 82): with a new photo it is uploaded first and
  // replaces the old one; with removePhoto the review loses its photo;
  // with neither, the photo stays as it is. The old file is deleted from
  // Storage once the review is saved. If saving fails, the new upload is
  // deleted again, so no unused file is left behind.
  async update(
    accessToken: string,
    id: string,
    changes: ReviewChanges,
    photoChange: { photo?: UploadedPhoto; removePhoto?: boolean } = {},
  ): Promise<ReviewDto> {
    const changePhoto = !!photoChange.photo || !!photoChange.removePhoto;
    const newPath = photoChange.photo ? await this.photos.upload(accessToken, photoChange.photo) : null;
    try {
      const { saved, oldPath } = await this.asTraveler(accessToken, async (runner) => {
        // The photo it had before, read in the same transaction (only the
        // traveler's own review is found).
        const [before]: { photo_path: string | null }[] = await runner.query(
          'select photo_path from public.reviews where id = $1 and user_id = auth.uid()',
          [id],
        );
        if (!before) throw notYours();
        // For UPDATE, TypeORM answers with [changed rows, how many].
        // $4 says whether the photo changes at all; $5 is the new place
        // (null to remove it).
        const [rows]: [ReviewDto[], number] = await runner.query(
          `update public.reviews
              set rating = $1,
                  comment = $2,
                  photo_path = case when $4 then $5 else photo_path end
            where id = $3
            returning ${COLUMNS}`,
          [changes.rating, changes.comment, id, changePhoto, newPath],
        );
        if (rows.length === 0) throw notYours();
        return { saved: rows[0], oldPath: before.photo_path };
      });
      if (changePhoto && oldPath && oldPath !== newPath) await this.photos.remove(accessToken, oldPath);
      return saved;
    } catch (error) {
      if (newPath) await this.photos.remove(accessToken, newPath);
      throw error;
    }
  }

  // Deletes the traveler's own review and says so. As with update,
  // someone else's review is invisible here, so nothing is deleted.
  // Its photo, if it had one, is deleted from Storage afterwards (ticket
  // 81); "returning photo_path" says which file that is.
  async remove(accessToken: string, id: string): Promise<DeletedReview> {
    const photoPath = await this.asTraveler(accessToken, async (runner) => {
      // For DELETE, TypeORM answers with [deleted rows, how many].
      const [rows, count]: [{ photo_path: string | null }[], number] = await runner.query(
        'delete from public.reviews where id = $1 returning photo_path',
        [id],
      );
      if (count === 0) throw notYours();
      return rows[0]?.photo_path ?? null;
    });
    if (photoPath) await this.photos.remove(accessToken, photoPath);
    return { id, message: 'Your review has been deleted.' };
  }

  // Who is asking, for "liked by me" on GET /v1/reviews. Reading reviews
  // never needs a login, so a missing, wrong or expired login just means
  // "nobody" instead of an error.
  async viewerIdFor(authorization?: string): Promise<string | null> {
    const token = authorization?.match(/^Bearer (.+)$/)?.[1];
    if (!token) return null;
    try {
      return await this.supabase.userIdFor(token);
    } catch {
      return null;
    }
  }

  // Marks someone else's review as helpful (POST /v1/reviews/:id/like),
  // as the logged-in traveler, so the review_likes policies (024) decide.
  // Everything goes through runner.manager: TypeORM on the same connection
  // and transaction that asTraveler switched to the traveler.
  // The two checks first only give friendlier messages; the database
  // refuses a like on your own review by itself too. Marking twice changes
  // nothing (orIgnore = "on conflict do nothing").
  like(accessToken: string, reviewId: string): Promise<LikeState> {
    return this.asTraveler(accessToken, async (runner) => {
      const review = await runner.manager.findOne(Review, {
        select: { user_id: true },
        where: { id: reviewId },
      });
      if (!review) throw reviewNotFound();

      // Who this traveler is, as Supabase sees it (a function, not a table,
      // so it stays a one-line query).
      const [me]: { id: string }[] = await runner.query('select auth.uid() as id');
      if (review.user_id === me.id) {
        throw new BadRequestException("You can't mark your own review as helpful.");
      }

      // Only review_id is sent: user_id and created_at are filled in by the
      // database (see ReviewLike). updateEntity(false): nothing to read back.
      await runner.manager
        .createQueryBuilder()
        .insert()
        .into(ReviewLike)
        .values({ review_id: reviewId })
        .orIgnore()
        .updateEntity(false)
        .execute();
      return { helpful_count: await helpfulCount(runner, reviewId), liked: true };
    });
  }

  // Removes the traveler's own like (DELETE /v1/reviews/:id/like). Row
  // Level Security only lets anyone delete their own likes, and the
  // condition asks only for this traveler's (auth.uid()), so this can never
  // remove someone else's. Unmarking twice changes nothing.
  unlike(accessToken: string, reviewId: string): Promise<LikeState> {
    return this.asTraveler(accessToken, async (runner) => {
      const reviewExists = await runner.manager.exists(Review, { where: { id: reviewId } });
      if (!reviewExists) throw reviewNotFound();
      await runner.manager
        .createQueryBuilder()
        .delete()
        .from(ReviewLike)
        .where('review_id = :reviewId', { reviewId })
        .andWhere('user_id = auth.uid()')
        .execute();
      return { helpful_count: await helpfulCount(runner, reviewId), liked: false };
    });
  }

  // Turns a database refusal into an answer the website understands.
  // Answers that are already HTTP answers (like "not found among yours")
  // pass straight through.
  private toHttpError(error: unknown) {
    if (error instanceof HttpException) return error;
    const code =
      error instanceof QueryFailedError
        ? (error.driverError as { code?: string } | undefined)?.code
        : undefined;
    switch (code) {
      // The one-review-per-place rule (the "unique" line in supabase/sql/020).
      case '23505':
        return new ConflictException("You've already reviewed this place.");
      // A rating or comment outside the limits.
      case '23514':
        return new BadRequestException('Please pick 1 to 5 stars and write 1 to 500 characters.');
      // The review was deleted while it was being liked.
      case '23503':
        return reviewNotFound();
      // The place does not exist (checked by the reviews trigger).
      case 'P0001':
        return new NotFoundException('That place does not exist.');
      // Refused by Row Level Security or by the table's permissions.
      case '42501':
        return new UnauthorizedException('Please log in again, then try again.');
    }
    this.logger.error(`Could not save review: ${String(error)}`);
    return new ServiceUnavailableException('Something went wrong. Please try again.');
  }
}
