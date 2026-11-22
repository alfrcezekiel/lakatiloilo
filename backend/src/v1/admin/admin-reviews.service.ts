import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { QueryRunner } from 'typeorm';
import { httpErrorFrom } from '../database-errors';
import { ReviewPhotosService, type ReviewPhotoDto } from '../reviews/review-photos.service';
import { TravelerTransactions } from '../traveler-transactions';
import { SupabaseService } from '../../supabase/supabase.service';
import { videoUrlOf } from '../reviews/review-videos.bucket';
import { withoutEmptyDeleted } from '../reviews/replies.service';

// One review as the Reviews screen shows it (full admin management round,
// ticket 122).
export interface AdminReviewDto {
  id: string;
  place_type: 'destination' | 'accommodation';
  place_id: string;
  place_name: string;
  reviewer_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  // Up to 4 photos, in order (ticket 113).
  photos: ReviewPhotoDto[];
  // Its video's address, or null (ticket 166), so the team can moderate it.
  video_url: string | null;
  hidden: boolean;
  created_at: Date;
  helpful_count: number;
  report_count: number;
  reply_count: number;
}

// One page of the list: 50 reviews, how many match in all, and where the
// next page starts (null when there is no more).
// One numbered page of the list (ticket 130): the reviews on it, how many
// match in all, and which page and size it is.
export interface AdminReviewPage {
  reviews: AdminReviewDto[];
  total: number;
  page: number;
  per_page: number;
}

// One reply under a review, as "Show replies" shows it (ticket 124),
// oldest first. A deleted reply ("This reply was deleted") has no writer,
// name or text.
export interface AdminReplyDto {
  id: string;
  parent_reply_id: string | null;
  replier_id: string | null;
  replier_name: string;
  comment: string;
  created_at: Date;
  updated_at: Date;
  deleted: boolean;
  // Hidden by the team (ticket 140): comment is still its text here, for
  // the dashboard; travelers see the hidden sentence instead.
  hidden: boolean;
  helpful_count: number;
}

// One traveler who marked a review or reply Helpful (ticket 125). Only the
// display name: never an email.
export interface AdminLikerDto {
  user_id: string;
  display_name: string;
  created_at: Date;
}

export type LikeKind = 'review' | 'reply';

const likeGone = () =>
  new NotFoundException('That Helpful mark is already gone. The list will refresh.');

const reviewNotFound = () =>
  new NotFoundException("We couldn't find that review. It may have been deleted.");
const replyNotFound = () =>
  new NotFoundException("We couldn't find that reply. It may already have been deleted.");

export type ReviewFilter = 'all' | 'hidden' | 'reported';
export const REVIEW_FILTERS: ReviewFilter[] = ['all', 'hidden', 'reported'];

// Pages and sorting (ticket 130, team request 2026-11-11; replaces the
// "Show more" cursor): Recently added, Most relevant (most Helpful marks
// plus replies) and Top-rated (most stars), 10, 25 or 50 per page. Ties
// go to the newest, then the id, so the order never jumps between pages.
export type ReviewSort = 'recent' | 'relevant' | 'top';
const ORDER_BY: Record<ReviewSort, string> = {
  recent: 'r.created_at desc, r.id desc',
  // Replies in the Trash and "This reply was deleted" placeholders don't
  // count, the same rule as the place page's Most relevant
  // (src/lib/review-order.ts; code review 2026-11-23).
  relevant: `(select count(*) from public.review_likes l where l.review_id = r.id)
             + (select count(*) from public.review_replies p
                 where p.review_id = r.id and p.trashed_at is null and p.deleted_at is null) desc,
             r.created_at desc, r.id desc`,
  top: 'r.rating desc, r.created_at desc, r.id desc',
};
export const PER_PAGE_CHOICES = [10, 25, 50];
const SEARCH_MAX = 100;
const PAGE_MAX = 10000;

// What the list asks for, checked, with plain messages.
export function reviewQueryFrom(query: Record<string, unknown>) {
  const q = typeof query.q === 'string' ? query.q.trim() : '';
  if (q.length > SEARCH_MAX) {
    throw new BadRequestException(`Please search with up to ${SEARCH_MAX} characters.`);
  }
  const show = (query.show ?? 'all') as ReviewFilter;
  if (!REVIEW_FILTERS.includes(show)) {
    throw new BadRequestException('Please choose All, Hidden or Reported.');
  }
  const sort = (query.sort ?? 'recent') as ReviewSort;
  if (!(sort in ORDER_BY)) {
    throw new BadRequestException('Please choose Recently added, Most relevant or Top-rated.');
  }
  const perPage = Number(query.per_page ?? 10);
  if (!PER_PAGE_CHOICES.includes(perPage)) {
    throw new BadRequestException('Please show 10, 25 or 50 reviews per page.');
  }
  const page = Number(query.page ?? 1);
  if (!Number.isInteger(page) || page < 1 || page > PAGE_MAX) {
    throw new BadRequestException('Please choose a page from the list.');
  }
  return { q, show, sort, perPage, page };
}

// Turns search words into an ILIKE pattern that matches them literally
// ("50%" finds "50%", not everything).
const likePattern = (text: string) => `%${text.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;

// The Reviews screen's data (ticket 122): every review, hidden ones too,
// newest first. Read AS the signed-in admin (TravelerTransactions), so the
// database's own rules decide: admins may read hidden reviews (040) and
// how many reports a review has (039), never who reported.
// AdminOnlyMiddleware checks is_admin() before this runs as well.
@Injectable()
export class AdminReviewsService {
  private readonly logger = new Logger(AdminReviewsService.name);

  constructor(
    private readonly travelerTransactions: TravelerTransactions,
    private readonly photos: ReviewPhotosService,
    private readonly supabase: SupabaseService,
  ) {}

  // Runs work as the signed-in admin; the database's own refusals become
  // plain sentences.
  private asAdmin<T>(accessToken: string, what: string, work: (runner: QueryRunner) => Promise<T>) {
    return this.travelerTransactions.run(accessToken, work, (error) =>
      httpErrorFrom(error, this.logger, what, {
        // Hide it / Show it on a reply in the Trash (061 refuses it; the
        // dashboard never offers it, code review 2026-11-15).
        '55000': () => new ConflictException('That reply is in the Trash. Restore it first.'),
      }),
    );
  }

  // A review's replies, oldest first, deleted ones included (they hold
  // their answers in place).
  replies(accessToken: string, reviewId: string): Promise<AdminReplyDto[]> {
    return this.asAdmin(accessToken, 'list replies', async (runner) => {
      const [review]: unknown[] = await runner.query('select 1 from public.reviews where id = $1', [reviewId]);
      if (!review) throw reviewNotFound();
      const replies: AdminReplyDto[] = await runner.query(
        `select p.id, p.parent_reply_id, p.user_id as replier_id, p.replier_name,
                case when p.trashed_at is null then coalesce(h.comment, p.comment) else '' end as comment,
                p.created_at, p.updated_at,
                (p.deleted_at is not null or p.trashed_at is not null) as deleted,
                p.hidden_at is not null as hidden,
                (select count(*)::int from public.reply_likes l where l.reply_id = p.id) as helpful_count
           from public.review_replies p
           left join public.reply_hidden_texts h on h.reply_id = p.id
          where p.review_id = $1
          order by p.created_at, p.id`,
        [reviewId],
      );
      // A reply in the Trash with no answers under it leaves the thread,
      // as a deleted one does (061).
      return withoutEmptyDeleted(replies);
    });
  }

  // Hide it / Show it on a reply (ticket 140), through the database's
  // admin_hide_reply and admin_show_reply (supabase/sql/056), which refuse
  // anyone who is not an admin. The text waits in an admins-only table
  // while hidden; answers under the reply stay. 404 for a reply that is
  // gone or deleted.
  setReplyHidden(
    accessToken: string,
    replyId: string,
    hidden: boolean,
  ): Promise<{ id: string; hidden: boolean; message: string }> {
    return this.asAdmin(accessToken, hidden ? 'hide a reply' : 'show a reply', async (runner) => {
      const [{ outcome }]: { outcome: 'hidden' | 'shown' | null }[] = await runner.query(
        hidden ? 'select public.admin_hide_reply($1) as outcome' : 'select public.admin_show_reply($1) as outcome',
        [replyId],
      );
      if (!outcome) throw replyNotFound();
      return {
        id: replyId,
        hidden,
        message: hidden
          ? 'The reply is hidden. Travelers see "This reply was hidden by the Lakat Iloilo team."'
          : 'The reply shows on the site again.',
      };
    });
  }

  // Delete reply (ticket 124; to the Trash since ticket 148), through the
  // database's admin_trash_reply (supabase/sql/061): travelers see "This
  // reply was deleted" in its place, so the answers under it stay (one
  // with no answers leaves the thread), and Restore in the Trash puts it
  // back. The function itself refuses anyone who is not an admin.
  removeReply(accessToken: string, replyId: string): Promise<{ id: string; outcome: string; message: string }> {
    return this.asAdmin(accessToken, 'delete a reply', async (runner) => {
      const [{ outcome }]: { outcome: 'trashed' | null }[] = await runner.query(
        'select public.admin_trash_reply($1) as outcome',
        [replyId],
      );
      if (!outcome) throw replyNotFound();
      return {
        id: replyId,
        outcome,
        message: 'Moved to the Trash. You can restore it there for 30 days.',
      };
    });
  }

  // Who marked one review or reply Helpful, newest first, through the
  // database's admin_likers (supabase/sql/053), which refuses anyone who
  // is not an admin and answers display names only.
  likers(accessToken: string, kind: LikeKind, id: string): Promise<AdminLikerDto[]> {
    return this.asAdmin(accessToken, 'list Helpful marks', async (runner) => {
      const [exists]: unknown[] = await runner.query(
        kind === 'review'
          ? 'select 1 from public.reviews where id = $1'
          : 'select 1 from public.review_replies where id = $1',
        [id],
      );
      if (!exists) throw kind === 'review' ? reviewNotFound() : replyNotFound();
      return runner.query(
        'select user_id, display_name, created_at from public.admin_likers($1, $2)',
        [kind, id],
      ) as Promise<AdminLikerDto[]>;
    });
  }

  // Remove (ticket 125): deletes one traveler's Helpful mark. The
  // database lets admins do this (053) and removes its notification
  // itself (036). Answers the new count.
  removeLike(
    accessToken: string,
    kind: LikeKind,
    id: string,
    userId: string,
  ): Promise<{ helpful_count: number; message: string }> {
    return this.asAdmin(accessToken, 'remove a Helpful mark', async (runner) => {
      const [rows]: [unknown[], number] = await runner.query(
        kind === 'review'
          ? 'delete from public.review_likes where review_id = $1 and user_id = $2 returning 1'
          : 'delete from public.reply_likes where reply_id = $1 and user_id = $2 returning 1',
        [id, userId],
      );
      if (rows.length === 0) throw likeGone();
      const [{ n }]: { n: number }[] = await runner.query(
        kind === 'review'
          ? 'select count(*)::int as n from public.review_likes where review_id = $1'
          : 'select count(*)::int as n from public.reply_likes where reply_id = $1',
        [id],
      );
      return { helpful_count: n, message: 'Removed. The Helpful count went down and its notification is gone.' };
    });
  }

  list(accessToken: string, query: ReturnType<typeof reviewQueryFrom>): Promise<AdminReviewPage> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        // The same filter for the page and for the total. Values travel as
        // parameters: $1 the search pattern (or null), $2 the filter.
        const where = `
              left join public.destinations d
                      on r.place_type = 'destination' and d.id = r.place_id
              left join public.accommodations a
                      on r.place_type = 'accommodation' and a.id = r.place_id
             where ($1::text is null
                    or r.comment ilike $1 or r.reviewer_name ilike $1
                    or coalesce(d.name, a.name) ilike $1)
               and ($2 = 'all'
                    or ($2 = 'hidden' and r.hidden_at is not null)
                    or ($2 = 'reported'
                        and exists (select 1 from public.review_reports rr where rr.review_id = r.id)))`;
        const params = [query.q ? likePattern(query.q) : null, query.show];

        // The order comes from the fixed list above (never from the
        // request as text); values travel as parameters.
        const rows: (Omit<AdminReviewDto, 'photos' | 'video_url'> & { video_path: string | null })[] = await runner.query(
          `select r.id, r.place_type, r.place_id,
                  coalesce(d.name, a.name, 'a place') as place_name,
                  r.user_id as reviewer_id, r.reviewer_name, r.rating, r.comment,
                  r.created_at, r.hidden_at is not null as hidden, r.video_path,
                  (select count(*)::int from public.review_likes l where l.review_id = r.id) as helpful_count,
                  (select count(*)::int from public.review_reports rr where rr.review_id = r.id) as report_count,
                  -- Not counting replies in the Trash (061; code review
                  -- 2026-11-15: "Replies (3)" opened 2).
                  (select count(*)::int from public.review_replies p
                    where p.review_id = r.id and p.trashed_at is null) as reply_count
             from public.reviews r
             ${where}
            order by ${ORDER_BY[query.sort]}
            limit $3 offset $4`,
          [...params, query.perPage, (query.page - 1) * query.perPage],
        );
        const [{ total }]: { total: number }[] = await runner.query(
          `select count(*)::int as total from public.reviews r ${where}`,
          params,
        );

        // Read as the admin, so hidden reviews' photos show too (044).
        const photos = await this.photos.photosFor(
          runner,
          rows.map((r) => r.id),
        );
        return {
          reviews: rows.map(({ video_path, ...review }) => ({
            ...review,
            photos: photos.get(review.id) ?? [],
            video_url: videoUrlOf(this.supabase, video_path),
          })),
          total,
          page: query.page,
          per_page: query.perPage,
        };
      },
      (error) => httpErrorFrom(error, this.logger, 'list reviews'),
    );
  }
}
