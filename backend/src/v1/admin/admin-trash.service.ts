import { ConflictException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { QueryFailedError, type QueryRunner } from 'typeorm';
import { httpErrorFrom } from '../database-errors';
import { TravelerTransactions } from '../traveler-transactions';
import { ReviewPhotosService } from '../reviews/review-photos.service';
import { PlacePhotosService } from './place-photos.service';
import { SupabaseService } from '../../supabase/supabase.service';
import { removeVideoFiles } from '../reviews/review-videos.bucket';

// The dashboard's Trash (admin extras round, ticket 147; supabase/sql/060).
// What an admin deletes waits there for 30 days and can be restored. A
// review in the Trash is left out of every normal read (the public, its
// writer, and the dashboard's other screens too); only these functions,
// for admins only, see it. Everything runs AS the signed-in admin.
// Replies and places too since ticket 148 (061); Delete for good and the
// 30 days since ticket 149 (062): the database deletes the rows and
// answers the photo files, which are then deleted from Storage, as the
// admin.

export const TRASH_DAYS = 30;

const DAY_MS = 24 * 60 * 60 * 1000;
// admin_restore_review's refusal while the review's place is in the Trash
// (supabase/sql/061), word for word.
const PLACE_IN_TRASH = 'Its place is in the Trash. Restore the place first, then this review.';
type PlaceType = 'destination' | 'accommodation';

// What every item in the Trash has.
interface TrashedBase {
  id: string;
  trashed_at: Date;
  trashed_by_name: string;
  // When it is deleted for good: 30 days after it went to the Trash.
  expires_at: Date;
}

// One review in the Trash, enough to recognise it.
export interface TrashedReviewDto extends TrashedBase {
  kind: 'review';
  place_type: PlaceType;
  place_id: string;
  place_name: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  reply_count: number;
  photo_count: number;
  report_count: number;
  // Its place is in the Trash too (on its own): Restore waits for it.
  place_in_trash: boolean;
}

// One reply in the Trash (ticket 148).
export interface TrashedReplyDto extends TrashedBase {
  kind: 'reply';
  review_id: string;
  place_type: PlaceType;
  place_id: string;
  place_name: string;
  reviewer_name: string;
  replier_name: string;
  comment: string;
  answer_count: number;
  like_count: number;
  // Its review is in the Trash too: Restore waits for it.
  review_in_trash: boolean;
}

// One place in the Trash (ticket 148), with the reviews that went with it.
export interface TrashedPlaceDto extends TrashedBase {
  kind: 'place';
  place_type: PlaceType;
  name: string;
  photo_url: string | null;
  review_count: number;
  photo_count: number;
}

// The photo files of what was deleted for good (062).
interface PlaceFiles {
  photo_urls: string[];
  review_photo_paths: string[];
}

export type TrashedItemDto = TrashedReviewDto | TrashedReplyDto | TrashedPlaceDto;

@Injectable()
export class AdminTrashService {
  private readonly logger = new Logger(AdminTrashService.name);

  constructor(
    private readonly travelerTransactions: TravelerTransactions,
    private readonly placePhotos: PlacePhotosService,
    private readonly reviewPhotos: ReviewPhotosService,
    private readonly supabase: SupabaseService,
  ) {}

  // Review videos (ticket 166). The delete functions in 062 answer the
  // photo files to remove, not the videos (065 came later), and reviews in
  // the Trash can't be read directly (060). So, in the same transaction,
  // the videos of reviews in the Trash are listed just before and just
  // after a delete for good (066); the ones whose review is gone are
  // deleted from Storage afterwards. The 30-day rule stays in 062.
  private async trashedVideos(runner: QueryRunner): Promise<Map<string, string>> {
    const rows: { review_id: string; video_path: string }[] = await runner.query(
      'select review_id, video_path from public.admin_trashed_review_videos()',
    );
    return new Map(rows.map((row) => [row.review_id, row.video_path]));
  }

  private static gone(before: Map<string, string>, after: Map<string, string>): string[] {
    return [...before].filter(([reviewId]) => !after.has(reviewId)).map(([, path]) => path);
  }

  // Deletes review video files as the admin (065 lets admins delete them;
  // review-videos.bucket.ts).
  private deleteVideos(accessToken: string, paths: string[]) {
    return removeVideoFiles(this.supabase, accessToken, paths, this.logger);
  }

  // Deletes the files of what was deleted for good. A file that cannot be
  // deleted is only logged: the rows are gone already.
  private async deleteFiles(accessToken: string, files: PlaceFiles | null | undefined) {
    if (!files) return;
    await Promise.all([
      ...files.photo_urls.map((url) => this.placePhotos.remove(accessToken, url)),
      ...files.review_photo_paths.map((path) => this.reviewPhotos.remove(accessToken, path)),
    ]);
  }

  private asAdmin<T>(accessToken: string, what: string, work: Parameters<TravelerTransactions['run']>[1]) {
    return this.travelerTransactions.run(accessToken, work, (error) =>
      httpErrorFrom(error, this.logger, what, {
        // Its writer has written a new review of the place since (060).
        '23505': () =>
          new ConflictException(
            'Its writer has written a new review of this place since. Delete that one first, or keep this one in the Trash.',
          ),
        // Its review, or its place, is in the Trash too (061). The
        // database's sentence says which; it is matched whole (code review
        // 2026-11-15), so a reworded sentence falls back to the review one
        // rather than to the wrong one by a single word.
        '55000': () =>
          new ConflictException(
            String((error as QueryFailedError).driverError?.message) === PLACE_IN_TRASH
              ? PLACE_IN_TRASH
              : 'Its review is in the Trash. Restore the review first, then this reply.',
          ),
      }),
    ) as Promise<T>;
  }

  // Everything in the Trash (reviews, replies and places), newest first.
  async list(accessToken: string): Promise<TrashedItemDto[]> {
    let expiredFiles: PlaceFiles | undefined;
    let expiredVideos: string[] = [];
    const [reviews, replies, places] = await this.asAdmin<
      [
        Omit<TrashedReviewDto, 'kind' | 'expires_at'>[],
        Omit<TrashedReplyDto, 'kind' | 'expires_at'>[],
        Omit<TrashedPlaceDto, 'kind' | 'expires_at'>[],
      ]
    >(accessToken, 'open the Trash', async (runner) => {
      // First, what has waited more than 30 days is deleted for good
      // (ticket 149; no scheduled job).
      const videosBefore = await this.trashedVideos(runner);
      const [{ expired }]: { expired: PlaceFiles }[] = await runner.query(
        'select public.admin_empty_expired_trash() as expired',
      );
      expiredFiles = expired;
      expiredVideos = AdminTrashService.gone(videosBefore, await this.trashedVideos(runner));
      return [
        await runner.query('select * from public.admin_trashed_reviews()'),
        await runner.query('select * from public.admin_trashed_replies()'),
        await runner.query('select * from public.admin_trashed_places()'),
      ];
    });
    await this.deleteFiles(accessToken, expiredFiles);
    await this.deleteVideos(accessToken, expiredVideos);
    const expires = (trashedAt: Date) => new Date(new Date(trashedAt).getTime() + TRASH_DAYS * DAY_MS);
    const items: TrashedItemDto[] = [
      ...reviews.map((row) => ({ ...row, kind: 'review' as const, expires_at: expires(row.trashed_at) })),
      ...replies.map((row) => ({ ...row, kind: 'reply' as const, expires_at: expires(row.trashed_at) })),
      ...places.map((row) => ({ ...row, kind: 'place' as const, expires_at: expires(row.trashed_at) })),
    ];
    return items.sort((x, y) => new Date(y.trashed_at).getTime() - new Date(x.trashed_at).getTime());
  }

  // Brings a review back as it was, with its replies, likes, photos and
  // reports. 404 when it is not in the Trash; 409 when its writer has
  // written a new review of the place since.
  async restoreReview(accessToken: string, id: string): Promise<{ id: string; message: string }> {
    const outcome = await this.asAdmin<string | null>(accessToken, 'restore a review', async (runner) => {
      const [row]: { outcome: string | null }[] = await runner.query(
        'select public.admin_restore_review($1) as outcome',
        [id],
      );
      return row.outcome;
    });
    if (!outcome) throw new NotFoundException("That review isn't in the Trash.");
    return { id, message: 'Restored. It shows on the site again, with its replies, likes and photos.' };
  }

  // Puts a reply back in its thread as it was (ticket 148). 404 when it is
  // not in the Trash; 409 while its review is in the Trash.
  async restoreReply(accessToken: string, id: string): Promise<{ id: string; message: string }> {
    const outcome = await this.asAdmin<string | null>(accessToken, 'restore a reply', async (runner) => {
      const [row]: { outcome: string | null }[] = await runner.query(
        'select public.admin_restore_reply($1) as outcome',
        [id],
      );
      return row.outcome;
    });
    if (!outcome) throw new NotFoundException("That reply isn't in the Trash any more.");
    return { id, message: 'Restored. It shows in its thread again.' };
  }

  // Brings a place back with the reviews that went with it (ticket 148).
  // 404 when it is not in the Trash.
  async restorePlace(accessToken: string, type: PlaceType, id: string): Promise<{ id: string; message: string }> {
    const outcome = await this.asAdmin<string | null>(accessToken, 'restore a place', async (runner) => {
      const [row]: { outcome: string | null }[] = await runner.query(
        'select public.admin_restore_place($1, $2) as outcome',
        [type, id],
      );
      return row.outcome;
    });
    if (!outcome) throw new NotFoundException("That place isn't in the Trash any more.");
    return { id, message: 'Restored. It shows on the site again, with its reviews and photos.' };
  }

  // Delete for good (ticket 149), for an item in the Trash only. 404 when
  // it is not there (restored, or deleted for good already).
  async deleteForGood(
    accessToken: string,
    kind: 'review' | 'reply' | 'place',
    id: string,
    placeType?: PlaceType,
  ): Promise<{ id: string; message: string }> {
    const result = await this.asAdmin<{ found: boolean; files: PlaceFiles | null; videos: string[] }>(
      accessToken,
      'delete for good',
      async (runner) => {
        if (kind === 'review') {
          const videosBefore = await this.trashedVideos(runner);
          const [{ paths }]: { paths: string[] | null }[] = await runner.query(
            'select public.admin_delete_review_for_good($1) as paths',
            [id],
          );
          return {
            found: paths !== null,
            files: paths ? { photo_urls: [], review_photo_paths: paths } : null,
            videos: AdminTrashService.gone(videosBefore, await this.trashedVideos(runner)),
          };
        }
        if (kind === 'reply') {
          const [{ outcome }]: { outcome: string | null }[] = await runner.query(
            'select public.admin_delete_reply_for_good($1) as outcome',
            [id],
          );
          return { found: outcome !== null, files: null, videos: [] };
        }
        // A place takes its reviews with it, and their videos.
        const videosBefore = await this.trashedVideos(runner);
        const [{ files }]: { files: PlaceFiles | null }[] = await runner.query(
          'select public.admin_delete_place_for_good($1, $2) as files',
          [placeType, id],
        );
        return {
          found: files !== null,
          files,
          videos: AdminTrashService.gone(videosBefore, await this.trashedVideos(runner)),
        };
      },
    );
    if (!result.found) throw new NotFoundException("That isn't in the Trash any more.");
    await this.deleteFiles(accessToken, result.files);
    await this.deleteVideos(accessToken, result.videos);
    return { id, message: 'Deleted for good.' };
  }
}
