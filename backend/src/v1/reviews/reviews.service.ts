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
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, QueryRunner, Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { SupabaseService } from '../../supabase/supabase.service';

// What the website gets for each review. Only the display name is ever
// sent, never the reviewer's email (the reviews table does not hold it).
export type ReviewDto = Pick<
  Review,
  'id' | 'user_id' | 'reviewer_name' | 'traveler_type' | 'rating' | 'comment' | 'created_at'
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

const COLUMNS = 'id, user_id, reviewer_name, traveler_type, rating, comment, created_at';

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
// transaction, so the answer includes the like just added or removed.
const helpfulCount = async (runner: QueryRunner, reviewId: string) => {
  const [row]: { count: number }[] = await runner.query(
    'select count(*)::int as count from public.review_likes where review_id = $1',
    [reviewId],
  );
  return row.count;
};

const notYours = () =>
  new NotFoundException("We couldn't find that review among yours. Please log in again and try.");

// Reads and writes the reviews table with TypeORM, through the backend's
// own database login (lakat_api, see supabase/sql/016 and 023).
@Injectable()
export class ReviewsService {
  private readonly logger = new Logger(ReviewsService.name);

  constructor(
    @InjectRepository(Review) private readonly reviews: Repository<Review>,
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly supabase: SupabaseService,
  ) { }

  // A place's reviews, newest first. Anyone may read them. Each review also
  // says how many travelers found it helpful, and (when the request carries
  // a valid login) whether this traveler did (profiles & likes round). Read
  // through lakat_api, which may read reviews and likes (023 and 024).
  // viewerId travels as $3, so it can never change the query; when it is
  // null, liked_by_me is simply false.
  async findForPlace(
    placeType: PlaceType,
    placeId: string,
    viewerId: string | null = null,
  ): Promise<ReviewWithLikes[]> {
    try {
      return await this.dataSource.query(
        `select r.id, r.user_id, r.reviewer_name, r.traveler_type, r.rating, r.comment, r.created_at,
                (select count(*)::int from public.review_likes l where l.review_id = r.id) as helpful_count,
                exists (select 1 from public.review_likes l
                        where l.review_id = r.id and l.user_id = $3::uuid) as liked_by_me
          from public.reviews r
          where r.place_type = $1 and r.place_id = $2
          order by r.created_at desc`,
        [placeType, placeId, viewerId],
      );
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

  // Runs `work` as the traveler whose login token this is.
  //
  // 1. Supabase Auth checks the token is genuine and says whose it is.
  // 2. In one transaction, the database is told "this request is that
  //    traveler" and switches to Supabase's "authenticated" role, just
  //    like a request from the website would.
  // 3. `work` runs there, so the Row Level Security policies from
  //    supabase/sql/020 check auth.uid() exactly as before.
  // Any error undoes the whole transaction.
  private async asTraveler<T>(
    accessToken: string,
    work: (runner: QueryRunner) => Promise<T>,
  ): Promise<T> {
    const userId = await this.supabase.userIdFor(accessToken);
    if (!userId) throw new UnauthorizedException('Please log in again, then try again.');

    const runner = this.dataSource.createQueryRunner();
    await runner.connect();
    await runner.startTransaction();
    try {
      // "set local" and the "true" below last only until this
      // transaction ends, so the next request starts clean.
      await runner.query(`select set_config('request.jwt.claims', $1, true)`, [
        JSON.stringify({ sub: userId, role: 'authenticated' }),
      ]);
      await runner.query('set local role authenticated');
      const result = await work(runner);
      await runner.commitTransaction();
      return result;
    } catch (error) {
      await runner.rollbackTransaction();
      throw this.toHttpError(error);
    } finally {
      await runner.release();
    }
  }

  // Adds a review. The database fills in user_id, reviewer_name and the
  // dates itself. The values travel separately from the SQL text ($1 to
  // $4), so what a traveler types can never change the query.
  create(accessToken: string, review: NewReview): Promise<ReviewDto> {
    return this.asTraveler(accessToken, async (runner) => {
      const rows: ReviewDto[] = await runner.query(
        `insert into public.reviews (place_type, place_id, rating, comment)
            values ($1, $2, $3, $4)
            returning ${COLUMNS}`,
        [review.place_type, review.place_id, review.rating, review.comment],
      );
      return rows[0];
    });
  }

  // Changes the stars and comment of the traveler's own review. Row Level
  // Security hides everyone else's reviews, so for someone else's review
  // (or one that no longer exists) nothing is changed and the answer is
  // "not found among yours".
  update(accessToken: string, id: string, changes: ReviewChanges): Promise<ReviewDto> {
    return this.asTraveler(accessToken, async (runner) => {
      // For UPDATE, TypeORM answers with [changed rows, how many].
      const [rows]: [ReviewDto[], number] = await runner.query(
        `update public.reviews set rating = $1, comment = $2
              where id = $3
              returning ${COLUMNS}`,
        [changes.rating, changes.comment, id],
      );
      if (rows.length === 0) throw notYours();
      return rows[0];
    });
  }

  // Deletes the traveler's own review and says so. As with update,
  // someone else's review is invisible here, so nothing is deleted.
  remove(accessToken: string, id: string): Promise<DeletedReview> {
    return this.asTraveler(accessToken, async (runner) => {
      // For DELETE, TypeORM answers with [deleted rows, how many].
      const [, count]: [unknown[], number] = await runner.query(
        'delete from public.reviews where id = $1',
        [id],
      );
      if (count === 0) throw notYours();
      return { id, message: 'Your review has been deleted.' };
    });
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
  // The two checks first only give friendlier messages; the database
  // refuses a like on your own review by itself too. Marking twice changes
  // nothing ("on conflict do nothing").
  like(accessToken: string, reviewId: string): Promise<LikeState> {
    return this.asTraveler(accessToken, async (runner) => {
      const [review]: { user_id: string }[] = await runner.query(
        'select user_id from public.reviews where id = $1',
        [reviewId],
      );
      if (!review) throw reviewNotFound();
      const [me]: { id: string }[] = await runner.query('select auth.uid() as id');
      if (review.user_id === me.id) {
        throw new BadRequestException("You can't mark your own review as helpful.");
      }
      await runner.query(
        'insert into public.review_likes (review_id) values ($1) on conflict do nothing',
        [reviewId],
      );
      return { helpful_count: await helpfulCount(runner, reviewId), liked: true };
    });
  }

  // Removes the traveler's own like (DELETE /v1/reviews/:id/like). Row
  // Level Security only lets anyone delete their own likes, so this can
  // never remove someone else's. Unmarking twice changes nothing.
  unlike(accessToken: string, reviewId: string): Promise<LikeState> {
    return this.asTraveler(accessToken, async (runner) => {
      const [review]: unknown[] = await runner.query(
        'select 1 from public.reviews where id = $1',
        [reviewId],
      );
      if (!review) throw reviewNotFound();
      await runner.query(
        'delete from public.review_likes where review_id = $1 and user_id = auth.uid()',
        [reviewId],
      );
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
