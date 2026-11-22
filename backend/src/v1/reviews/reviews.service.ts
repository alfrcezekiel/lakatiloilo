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
import { ReviewPhotosService, type ReviewPhotoDto } from './review-photos.service';
import { removeVideoFiles, videoUrlOf } from './review-videos.bucket';

// What the website gets for each review. Only the display name is ever
// sent, never the reviewer's email (the reviews table does not hold it).
export type ReviewDto = Pick<
  Review,
  'id' | 'user_id' | 'reviewer_name' | 'traveler_type' | 'rating' | 'comment' | 'created_at'
> & {
  // Up to 4 photos, in order (ticket 113).
  photos: ReviewPhotoDto[];
  // Its video's public address, or null (ticket 165).
  video_url: string | null;
};

// A review row as read from the database, before its photos and video
// address are added.
type ReviewRow<T> = Omit<T, 'photos' | 'video_url'> & { video_path: string | null };

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

const COLUMNS = 'id, user_id, reviewer_name, traveler_type, rating, comment, created_at, video_path';

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

export const notYours = () =>
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
      const rows = await this.reviews
        .createQueryBuilder('r')
        .select('r.id', 'id')
        .addSelect('r.user_id', 'user_id')
        .addSelect('r.reviewer_name', 'reviewer_name')
        .addSelect('r.traveler_type', 'traveler_type')
        .addSelect('r.rating', 'rating')
        .addSelect('r.comment', 'comment')
        .addSelect('r.created_at', 'created_at')
        .addSelect('r.video_path', 'video_path')
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
        .getRawMany<ReviewRow<ReviewWithLikes>>();
      // Their photos (ticket 113), read the same way: only photos of
      // reviews everyone may read.
      const photos = await this.photos.photosFor(
        this.reviews.manager,
        rows.map((r) => r.id),
      );
      return rows.map((r) => this.withMedia(r, photos.get(r.id) ?? []));
    } catch (error) {
      this.logger.error(`Could not read reviews: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load reviews right now.');
    }
  }

  // The logged-in traveler's own review of this place, if the team has hidden
  // it (ticket 109). Hidden reviews are left out of findForPlace (the
  // backend's own login may not read them, supabase/sql/040), so this one
  // is read AS the traveler: the database only lets writers read their own
  // hidden review. Shown only to them, with "Hidden while the team reviews
  // it." If anything goes wrong it is simply left out, so the place page
  // still loads.
  async ownHiddenForPlace(
    accessToken: string,
    placeType: PlaceType,
    placeId: string,
  ): Promise<ReviewWithLikes[]> {
    try {
      return await this.travelerTransactions.run(
        accessToken,
        async (runner) => {
          const rows: ReviewRow<ReviewWithLikes>[] = await runner.query(
            `select r.id, r.user_id, r.reviewer_name, r.traveler_type, r.rating, r.comment,
                    r.created_at, r.video_path,
                    (select count(*)::int from public.review_likes l where l.review_id = r.id)
                      as helpful_count,
                    false as liked_by_me
               from public.reviews r
              where r.place_type = $1 and r.place_id = $2
                and r.user_id = auth.uid() and r.hidden_at is not null`,
            [placeType, placeId],
          );
          // Its photos, read as the writer (a hidden review's photos are
          // only for its writer and the team, 044).
          const photos = await this.photos.photosFor(
            runner,
            rows.map((r) => r.id),
          );
          return rows.map((r) => this.withMedia(r, photos.get(r.id) ?? []));
        },
        (error) => error as Error,
      );
    } catch (error) {
      this.logger.warn(`Could not read the traveler's hidden review: ${String(error)}`);
      return [];
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
  // $4), so what a traveler types can never change the query. Photos are
  // added afterwards, one per request (addPhoto, ticket 113), so a new
  // review starts with none.
  create(accessToken: string, review: NewReview): Promise<ReviewDto> {
    return this.asTraveler(accessToken, async (runner) => {
      const rows: ReviewRow<ReviewDto>[] = await runner.query(
        `insert into public.reviews (place_type, place_id, rating, comment)
            values ($1, $2, $3, $4)
            returning ${COLUMNS}`,
        [review.place_type, review.place_id, review.rating, review.comment],
      );
      return this.withMedia(rows[0], []);
    });
  }

  // Changes the stars and comment of the traveler's own review, and
  // answers with it and its photos. Row Level Security only lets writers
  // change their own reviews, so for someone else's review (or one that no
  // longer exists) nothing is changed and the answer is "not found among
  // yours". Photos are added and removed on their own (ticket 113).
  update(accessToken: string, id: string, changes: ReviewChanges): Promise<ReviewDto> {
    return this.asTraveler(accessToken, async (runner) => {
      // For UPDATE, TypeORM answers with [changed rows, how many].
      const [rows]: [ReviewRow<ReviewDto>[], number] = await runner.query(
        `update public.reviews
            set rating = $1, comment = $2
          where id = $3 and user_id = auth.uid()
          returning ${COLUMNS}`,
        [changes.rating, changes.comment, id],
      );
      if (rows.length === 0) throw notYours();
      const photos = await this.photos.photosFor(runner, [id]);
      return this.withMedia(rows[0], photos.get(id) ?? []);
    });
  }

  // Deletes the traveler's own review and says so. As with update,
  // someone else's review is invisible here, so nothing is deleted. Its
  // photo rows go with it (on delete cascade); the files are then deleted
  // from Storage, as the traveler.
  async remove(accessToken: string, id: string): Promise<DeletedReview> {
    const { paths, videoPath } = await this.asTraveler(accessToken, async (runner) => {
      const filePaths = await this.photos.pathsOf(runner, id);
      // For DELETE, TypeORM answers with [deleted rows, how many].
      const [rows, count]: [{ video_path: string | null }[], number] = await runner.query(
        'delete from public.reviews where id = $1 and user_id = auth.uid() returning video_path',
        [id],
      );
      if (count === 0) throw notYours();
      return { paths: filePaths, videoPath: rows[0]?.video_path ?? null };
    });
    for (const path of paths) await this.photos.remove(accessToken, path);
    // Its video too (ticket 165), so no file is left behind.
    if (videoPath) await removeVideoFiles(this.supabase, accessToken, [videoPath], this.logger);
    return { id, message: 'Your review has been deleted.' };
  }

  // A review row as the website gets it: its photos, and its video's
  // public address instead of where it is stored (ticket 165).
  private withMedia<T>(row: ReviewRow<T>, photos: ReviewPhotoDto[]) {
    const { video_path, ...rest } = row;
    return {
      ...rest,
      photos,
      video_url: videoUrlOf(this.supabase, video_path),
    } as unknown as T;
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
