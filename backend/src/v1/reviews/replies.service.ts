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
import { QueryFailedError, type QueryRunner, Repository } from 'typeorm';
import { Review } from '../../entities/review.entity';
import { ReviewReply } from '../../entities/review-reply.entity';
import { ReplyLike, replyHelpfulCountOf } from '../../entities/reply-like.entity';
import { TravelerTransactions } from '../traveler-transactions';

// What the website gets for each reply. Never an email (the table holds
// none).
export type ReplyDto = Pick<
  ReviewReply,
  | 'id'
  | 'review_id'
  | 'parent_reply_id'
  | 'user_id'
  | 'replier_name'
  | 'traveler_type'
  | 'comment'
  | 'created_at'
  | 'updated_at'
>;

// A reply as GET /v1/reviews sends it: the reply, plus its "Helpful"
// count and whether the traveler asking marked it (ticket 96), and whether
// it was deleted (ticket 100). A deleted reply carries no name, tag, text,
// writer or Helpful count.
export type ReplyWithLikes = ReplyDto & {
  helpful_count: number;
  liked_by_me: boolean;
  deleted: boolean;
  // Hidden by the Lakat Iloilo team (ticket 140): its text is empty for
  // everyone but its writer, who gets their own text back.
  hidden: boolean;
};

// What the website gets after marking or unmarking a reply as helpful.
export interface ReplyLikeState {
  helpful_count: number;
  liked: boolean;
}

// What the website gets after deleting a reply.
export interface DeletedReply {
  id: string;
  message: string;
}

const REPLY_COLUMNS: (keyof ReplyDto)[] = [
  'id',
  'review_id',
  'parent_reply_id',
  'user_id',
  'replier_name',
  'traveler_type',
  'comment',
  'created_at',
  'updated_at',
];

const reviewNotFound = () => new NotFoundException("We couldn't find that review.");
const replyNotFound = () => new NotFoundException("We couldn't find that reply.");

// How many travelers found a reply helpful, counted inside the same
// transaction, so the answer includes the like just added or removed.
const replyHelpfulCount = (runner: QueryRunner, replyId: string) =>
  runner.manager.count(ReplyLike, { where: { reply_id: replyId } });
const parentNotUnderReview = () => new BadRequestException("That reply isn't under this review.");
const replyWasDeleted = () =>
  new BadRequestException("That reply was deleted, so it can't be answered.");
const replyNotYours = () =>
  new NotFoundException("We couldn't find that reply among yours. Please log in again and try.");

// Leaves out a deleted reply with no answers left under it, and so on up
// the thread. Deleting such a reply removes it (034), but one in the
// Trash (061) waits in its place as "deleted"; with no answers under it
// there is nothing to keep it there for.
export function withoutEmptyDeleted<T extends { id: string; parent_reply_id: string | null; deleted: boolean }>(list: T[]): T[] {
  let kept = list;
  for (;;) {
    const parents = new Set(kept.map((reply) => reply.parent_reply_id));
    const next = kept.filter((reply) => !reply.deleted || parents.has(reply.id));
    if (next.length === kept.length) return kept;
    kept = next;
  }
}

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
  // One request for a whole page of reviews. Each reply also says how many
  // travelers found it helpful, and (with a valid login, viewerId) whether
  // this traveler did (ticket 96), as small sub-queries like the reviews'
  // own Helpful columns. Every value travels as a named parameter.
  async forReviews(
    reviewIds: string[],
    viewerId: string | null = null,
  ): Promise<Map<string, ReplyWithLikes[]>> {
    const byReview = new Map<string, ReplyWithLikes[]>();
    if (reviewIds.length === 0) return byReview;
    try {
      // select([]) first: only the columns named below, never the whole row.
      let query = this.replies.createQueryBuilder('p').select([]);
      for (const column of REPLY_COLUMNS) query = query.addSelect(`p.${column}`, column);
      const rows = await query
        // A reply in the Trash (061) shows as deleted: the database already
        // moved its text, name, tag and writer out of the row.
        .addSelect('(p.deleted_at IS NOT NULL OR p.trashed_at IS NOT NULL)', 'deleted')
        .addSelect('p.hidden_at IS NOT NULL', 'hidden')
        // The writer's own hidden text (056: the backend's login may read
        // it); everyone else gets the empty text the reply now holds.
        .addSelect(
          (own) =>
            own
              .select('h.comment')
              .from('reply_hidden_texts', 'h')
              .where('h.reply_id = p.id')
              .andWhere('p.user_id = CAST(:viewerId AS uuid)'),
          'own_hidden_text',
        )
        .addSelect(replyHelpfulCountOf('p'), 'helpful_count')
        .addSelect(
          (mine) =>
            mine
              .select('COUNT(*) > 0')
              .from(ReplyLike, 'm')
              .where('m.reply_id = p.id')
              .andWhere('m.user_id = CAST(:viewerId AS uuid)'),
          'liked_by_me',
        )
        .where('p.review_id IN (:...reviewIds)', { reviewIds })
        .setParameter('viewerId', viewerId)
        .orderBy('p.created_at', 'ASC')
        .getRawMany<ReplyWithLikes & { own_hidden_text: string | null }>();
      for (const { own_hidden_text: ownHiddenText, ...row } of rows) {
        if (row.hidden && ownHiddenText !== null) row.comment = ownHiddenText;
        // The database already cleared a deleted reply's text, name and
        // type (034); its writer is left out too.
        const reply: ReplyWithLikes = row.deleted
          ? { ...row, user_id: '', helpful_count: 0, liked_by_me: false, hidden: false }
          : row;
        const list = byReview.get(reply.review_id) ?? [];
        list.push(reply);
        byReview.set(reply.review_id, list);
      }
      for (const [reviewId, list] of byReview) byReview.set(reviewId, withoutEmptyDeleted(list));
      return byReview;
    } catch (error) {
      this.logger.error(`Could not read replies: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load reviews right now.');
    }
  }

  // Adds a reply under a review, as the logged-in traveler. Only review_id,
  // the text and (when answering a reply) parent_reply_id are sent; the
  // database fills in the rest (see ReviewReply) and answers with the
  // saved reply ("returning"). The database refuses a parent reply under a
  // different review (028), which becomes a 400.
  create(
    accessToken: string,
    reviewId: string,
    comment: string,
    parentReplyId: string | null = null,
  ): Promise<ReplyDto> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const reviewExists = await runner.manager.exists(Review, { where: { id: reviewId } });
        if (!reviewExists) throw reviewNotFound();
        const result = await runner.manager
          .createQueryBuilder()
          .insert()
          .into(ReviewReply)
          .values(
            parentReplyId
              ? { review_id: reviewId, comment, parent_reply_id: parentReplyId }
              : { review_id: reviewId, comment },
          )
          .returning(REPLY_COLUMNS)
          .updateEntity(false)
          .execute();
        return (result.raw as ReplyDto[])[0];
      },
      (error) => this.toHttpError(error),
    );
  }

  // Changes the text of the traveler's own reply (ticket 95) and answers
  // with the saved reply; the database sets updated_at (031). Row Level
  // Security lets nobody change someone else's reply, so for those (or a
  // reply that no longer exists) nothing changes and the answer is "not
  // found among yours", like deleting.
  update(accessToken: string, replyId: string, comment: string): Promise<ReplyDto> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const result = await runner.manager
          .createQueryBuilder()
          .update(ReviewReply)
          .set({ comment })
          .where('id = :replyId', { replyId })
          .returning(REPLY_COLUMNS)
          .updateEntity(false)
          .execute();
        const saved = (result.raw as ReplyDto[])[0];
        if (!saved) throw replyNotYours();
        return saved;
      },
      (error) => this.toHttpError(error),
    );
  }

  // Marks someone else's reply as helpful (POST /v1/replies/:id/like,
  // ticket 96), as the logged-in traveler, so the reply_likes policies
  // (032) decide. The checks first only give friendlier messages; the
  // database refuses a like on your own reply by itself too. Marking twice
  // changes nothing (orIgnore = "on conflict do nothing").
  like(accessToken: string, replyId: string): Promise<ReplyLikeState> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const reply = await runner.manager.findOne(ReviewReply, {
          select: { user_id: true, deleted_at: true },
          where: { id: replyId },
        });
        // A deleted reply cannot be liked (034); to the traveler it is gone.
        if (!reply || reply.deleted_at) throw replyNotFound();
        const [me]: { id: string }[] = await runner.query('select auth.uid() as id');
        if (reply.user_id === me.id) {
          throw new BadRequestException("You can't mark your own reply as helpful.");
        }
        // Only reply_id is sent: user_id and created_at are filled in by the
        // database (see ReplyLike).
        await runner.manager
          .createQueryBuilder()
          .insert()
          .into(ReplyLike)
          .values({ reply_id: replyId })
          .orIgnore()
          .updateEntity(false)
          .execute();
        return { helpful_count: await replyHelpfulCount(runner, replyId), liked: true };
      },
      (error) => this.toHttpError(error),
    );
  }

  // Removes the traveler's own like on a reply (DELETE
  // /v1/replies/:id/like). Only this traveler's like (auth.uid()), and Row
  // Level Security allows nothing else. Unmarking twice changes nothing.
  unlike(accessToken: string, replyId: string): Promise<ReplyLikeState> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const replyExists = await runner.manager.exists(ReviewReply, { where: { id: replyId } });
        if (!replyExists) throw replyNotFound();
        await runner.manager
          .createQueryBuilder()
          .delete()
          .from(ReplyLike)
          .where('reply_id = :replyId', { replyId })
          .andWhere('user_id = auth.uid()')
          .execute();
        return { helpful_count: await replyHelpfulCount(runner, replyId), liked: false };
      },
      (error) => this.toHttpError(error),
    );
  }

  // Deletes the traveler's own reply, through the database's
  // delete_own_reply function (ticket 100, supabase/sql/034): a reply with
  // answers stays as "This reply was deleted" and keeps them; one without
  // is removed. The function only touches this traveler's own replies
  // (auth.uid()), so for someone else's reply, or one that is already
  // deleted or missing, it answers null and the answer is "not found
  // among yours".
  remove(accessToken: string, replyId: string): Promise<DeletedReply> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const [result]: { outcome: string | null }[] = await runner.query(
          'select public.delete_own_reply($1) as outcome',
          [replyId],
        );
        if (!result?.outcome) throw replyNotYours();
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
      // The parent reply is missing or under another review (028).
      case '22023':
        return parentNotUnderReview();
      // The parent reply was deleted (034).
      case '55000':
        return replyWasDeleted();
      // Refused by Row Level Security or by the table's permissions.
      case '42501':
        return new UnauthorizedException('Please log in again, then try again.');
    }
    this.logger.error(`Could not save reply: ${String(error)}`);
    return new ServiceUnavailableException('Something went wrong. Please try again.');
  }
}
