import {
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, QueryFailedError, Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { ReviewReply } from '../../entities/review-reply.entity';
import { TravelerTransactions } from '../traveler-transactions';

// What the website gets for each reply. Never an email (the table holds
// none).
export type ReplyDto = Pick<
  ReviewReply,
  'id' | 'review_id' | 'user_id' | 'replier_name' | 'traveler_type' | 'comment' | 'created_at'
>;

// What the website gets after deleting a reply.
export interface DeletedReply {
  id: string;
  message: string;
}

const REPLY_COLUMNS: (keyof ReplyDto)[] = [
  'id',
  'review_id',
  'user_id',
  'replier_name',
  'traveler_type',
  'comment',
  'created_at',
];

const reviewNotFound = () => new NotFoundException("We couldn't find that review.");
const replyNotYours = () =>
  new NotFoundException("We couldn't find that reply among yours. Please log in again and try.");

// Replies under reviews (review extras round, ticket 79), through the
// ReviewReply entity. Reading uses the backend's own database login
// (lakat_api may read replies, see 025). Adding and deleting run as the
// logged-in traveler (TravelerTransactions), so the review_replies policies
// decide who may do what.
@Injectable()
export class RepliesService {
  private readonly logger = new Logger(RepliesService.name);

  constructor(
    @InjectRepository(ReviewReply) private readonly replies: Repository<ReviewReply>,
    private readonly travelerTransactions: TravelerTransactions,
  ) {}

  // The replies under these reviews, oldest first, grouped by review id.
  // One request for a whole page of reviews.
  async forReviews(reviewIds: string[]): Promise<Map<string, ReplyDto[]>> {
    const byReview = new Map<string, ReplyDto[]>();
    if (reviewIds.length === 0) return byReview;
    try {
      const rows = await this.replies.find({
        select: REPLY_COLUMNS,
        where: { review_id: In(reviewIds) },
        order: { created_at: 'ASC' },
      });
      for (const reply of rows) {
        const list = byReview.get(reply.review_id) ?? [];
        list.push(reply);
        byReview.set(reply.review_id, list);
      }
      return byReview;
    } catch (error) {
      this.logger.error(`Could not read replies: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load reviews right now.');
    }
  }

  // Adds a reply under a review, as the logged-in traveler. Only review_id
  // and the text are sent; the database fills in the rest (see ReviewReply)
  // and answers with the saved reply ("returning").
  create(accessToken: string, reviewId: string, comment: string): Promise<ReplyDto> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const reviewExists = await runner.manager.exists(Review, { where: { id: reviewId } });
        if (!reviewExists) throw reviewNotFound();
        const result = await runner.manager
          .createQueryBuilder()
          .insert()
          .into(ReviewReply)
          .values({ review_id: reviewId, comment })
          .returning(REPLY_COLUMNS)
          .updateEntity(false)
          .execute();
        return (result.raw as ReplyDto[])[0];
      },
      (error) => this.toHttpError(error),
    );
  }

  // Deletes the traveler's own reply. Row Level Security makes everyone
  // else's replies impossible to delete, so for someone else's reply (or
  // one that no longer exists) nothing is deleted and the answer is "not
  // found among yours".
  remove(accessToken: string, replyId: string): Promise<DeletedReply> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const result = await runner.manager
          .createQueryBuilder()
          .delete()
          .from(ReviewReply)
          .where('id = :replyId', { replyId })
          .execute();
        if (!result.affected) throw replyNotYours();
        return { id: replyId, message: 'Your reply has been deleted.' };
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
      // Text outside the limits (the "check" line in 025).
      case '23514':
        return new BadRequestException('Please write 1 to 300 characters.');
      // The review was deleted while the reply was being saved.
      case '23503':
        return reviewNotFound();
      // Refused by Row Level Security or by the table's permissions.
      case '42501':
        return new UnauthorizedException('Please log in again, then try again.');
    }
    this.logger.error(`Could not save reply: ${String(error)}`);
    return new ServiceUnavailableException('Something went wrong. Please try again.');
  }
}
