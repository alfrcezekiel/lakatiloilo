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
import { QueryFailedError } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { ReviewReport, type ReportReason } from '../../entities/review-report.entity';
import { TravelerTransactions } from '../traveler-transactions';

const THANKS = 'Thanks — the team will take a look.';

// Reporting a review (review extras round, ticket 80), through the
// ReviewReport entity, as the logged-in traveler (TravelerTransactions), so
// the review_reports policy (026) decides. Reports can never be read back
// through the app, so this only ever adds one; the team reads them in the
// Supabase dashboard.
@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(private readonly travelerTransactions: TravelerTransactions) {}

  report(
    accessToken: string,
    reviewId: string,
    reason: ReportReason,
    note: string | null,
  ): Promise<{ message: string }> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        // These two checks only give friendlier messages; the database
        // refuses a report of your own review by itself too.
        const review = await runner.manager.findOne(Review, {
          select: { user_id: true },
          where: { id: reviewId },
        });
        if (!review) throw new NotFoundException("We couldn't find that review.");
        const [me]: { id: string }[] = await runner.query('select auth.uid() as id');
        if (review.user_id === me.id) {
          throw new BadRequestException("You can't report your own review.");
        }

        // Only review_id, reason and note are sent. updateEntity(false) and
        // no "returning": the traveler may not read reports, so the saved
        // row is never asked for back.
        await runner.manager
          .createQueryBuilder()
          .insert()
          .into(ReviewReport)
          .values({ review_id: reviewId, reason, note })
          .updateEntity(false)
          .execute();
        return { message: THANKS };
      },
      (error) => this.toHttpError(error),
    );
  }

  // Turns a database refusal into an answer the website understands.
  private toHttpError(error: unknown) {
    if (error instanceof HttpException) return error;
    const code =
      error instanceof QueryFailedError
        ? (error.driverError as { code?: string } | undefined)?.code
        : undefined;
    switch (code) {
      // One report per traveler per review (the "unique" line in 026).
      case '23505':
        return new ConflictException("You've already reported this review.");
      // A reason outside the list, or a note over 300 characters.
      case '23514':
        return new BadRequestException('Please choose a reason, and keep the note to 300 characters.');
      // The review was deleted while it was being reported.
      case '23503':
        return new NotFoundException("We couldn't find that review.");
      // Refused by Row Level Security or by the table's permissions.
      case '42501':
        return new UnauthorizedException('Please log in again, then try again.');
    }
    this.logger.error(`Could not save report: ${String(error)}`);
    return new ServiceUnavailableException('Something went wrong. Please try again.');
  }
}
