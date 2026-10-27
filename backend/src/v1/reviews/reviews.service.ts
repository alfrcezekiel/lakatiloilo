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

const COLUMNS = 'id, user_id, reviewer_name, traveler_type, rating, comment, created_at';

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

  // A place's reviews, newest first. Anyone may read them.
  async findForPlace(placeType: PlaceType, placeId: string): Promise<ReviewDto[]> {
    try {
      return await this.reviews.find({
        select: ['id', 'user_id', 'reviewer_name', 'traveler_type', 'rating', 'comment', 'created_at'],
        where: { place_type: placeType, place_id: placeId },
        order: { created_at: 'DESC' },
      });
    } catch (error) {
      this.logger.error(`Could not read reviews: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load reviews right now.');
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

  // Deletes the traveler's own review. As with update, someone else's
  // review is invisible here, so nothing is deleted.
  remove(accessToken: string, id: string): Promise<void> {
    return this.asTraveler(accessToken, async (runner) => {
      // For DELETE, TypeORM answers with [deleted rows, how many].
      const [, count]: [unknown[], number] = await runner.query(
        'delete from public.reviews where id = $1',
        [id],
      );
      if (count === 0) throw notYours();
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
