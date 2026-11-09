import {
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { QueryRunner } from 'typeorm';
import { ReviewPhotosService, type ReviewPhotoDto } from '../reviews/review-photos.service';
import { TravelerTransactions } from '../traveler-transactions';

// One report on a review, as the Reports screen shows it. Never who sent
// it: the database does not let admins read that (supabase/sql/039).
export interface ReportDto {
  id: string;
  // 'spam', 'offensive', 'not_about_place' or 'other'
  reason: string;
  note: string | null;
  created_at: Date;
}

// One reported review with all its reports (ticket 108).
export interface ReportedReviewDto {
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
  // Hidden by the team (ticket 109), or by three reports (ticket 110).
  hidden: boolean;
  created_at: Date;
  report_count: number;
  reports: ReportDto[];
}

// Enough for the team's whole queue; the screen says when there are more.
const LIMIT = 100;

// What the website gets after Keep it, Hide it or Delete review.
export interface ModerationResult {
  id: string;
  message: string;
}

const reviewGone = () =>
  new NotFoundException("We couldn't find that review. It may already have been deleted.");

// The Reports screen's data (admin dashboard & moderation round, ticket
// 108). Read AS the signed-in admin (TravelerTransactions), so the
// database's own rule (039: only admins may read reports) decides; anyone
// else would simply get an empty list. Admin-only routes check
// is_admin() before this runs as well (AdminOnlyMiddleware).
@Injectable()
export class AdminReportsService {
  private readonly logger = new Logger(AdminReportsService.name);

  constructor(
    private readonly travelerTransactions: TravelerTransactions,
    private readonly photos: ReviewPhotosService,
  ) {}

  // Runs work as the signed-in admin, so Row Level Security and the review
  // trigger (supabase/sql/040) decide; database errors become a plain
  // "try again".
  private asAdmin<T>(accessToken: string, work: (runner: QueryRunner) => Promise<T>): Promise<T> {
    return this.travelerTransactions.run(accessToken, work, (error) => {
      if (error instanceof HttpException) return error;
      this.logger.error(`Could not moderate a review: ${String(error)}`);
      return new ServiceUnavailableException('Something went wrong. Please try again.');
    });
  }

  // Every review with at least one report, most reports first (then the
  // most recently reported), each with its reports, newest first.
  list(accessToken: string): Promise<ReportedReviewDto[]> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const rows: Omit<ReportedReviewDto, 'photos'>[] = await runner.query(
          `select r.id, r.place_type, r.place_id,
                  coalesce(d.name, a.name, 'a place') as place_name,
                  r.user_id as reviewer_id, r.reviewer_name, r.rating, r.comment,
                  r.created_at, r.hidden_at is not null as hidden,
                  count(rr.id)::int as report_count,
                  json_agg(
                    json_build_object('id', rr.id, 'reason', rr.reason,
                                      'note', rr.note, 'created_at', rr.created_at)
                      order by rr.created_at desc
                    ) as reports
              from public.review_reports rr
              join public.reviews r on r.id = rr.review_id
              left join public.destinations d
                      on r.place_type = 'destination' and d.id = r.place_id
              left join public.accommodations a
                      on r.place_type = 'accommodation' and a.id = r.place_id
            group by r.id, d.name, a.name
            order by count(rr.id) desc, max(rr.created_at) desc
            limit $1`,
          [LIMIT],
        );
        // Read as the admin, so hidden reviews' photos show too (044).
        const photos = await this.photos.photosFor(
          runner,
          rows.map((r) => r.id),
        );
        return rows.map((review) => ({ ...review, photos: photos.get(review.id) ?? [] }));
      },
      (error) => {
        if (error instanceof HttpException) return error;
        this.logger.error(`Could not list reports: ${String(error)}`);
        return new ServiceUnavailableException('Something went wrong. Please try again.');
      },
    );
  }

  // Keep it (ticket 109): the team decided the review is fine. Its reports
  // are removed and, if it was hidden, it shows again.
  keep(accessToken: string, reviewId: string): Promise<ModerationResult> {
    return this.asAdmin(accessToken, async (runner) => {
      const [rows]: [unknown[], number] = await runner.query(
        'update public.reviews set hidden_at = null where id = $1 returning id',
        [reviewId],
      );
      if (rows.length === 0) throw reviewGone();
      await runner.query('delete from public.review_reports where review_id = $1', [reviewId]);
      return { id: reviewId, message: 'Kept. Its reports were removed and it shows on the site.' };
    });
  }

  // Hide it (ticket 109): the review disappears from the place page, the
  // ratings and the writer's public profile; its writer still sees it with
  // "Hidden while the team reviews it." The reports stay, so it stays on
  // the Reports screen. Hiding twice keeps the first time.
  hide(accessToken: string, reviewId: string): Promise<ModerationResult> {
    return this.asAdmin(accessToken, async (runner) => {
      const [rows]: [unknown[], number] = await runner.query(
        `update public.reviews set hidden_at = coalesce(hidden_at, now())
          where id = $1 returning id`,
        [reviewId],
      );
      if (rows.length === 0) throw reviewGone();
      return { id: reviewId, message: 'Hidden. Only its writer and the team can see it now.' };
    });
  }

  // Delete review (ticket 109): the review goes, with its replies, likes,
  // reports, notifications and photo rows (on delete cascade). Its photo
  // files are then deleted from Storage, as the admin (040 lets admins do
  // that).
  async remove(accessToken: string, reviewId: string): Promise<ModerationResult> {
    const paths = await this.asAdmin(accessToken, async (runner) => {
      const filePaths = await this.photos.pathsOf(runner, reviewId);
      const [rows]: [unknown[], number] = await runner.query(
        'delete from public.reviews where id = $1 returning id',
        [reviewId],
      );
      if (rows.length === 0) throw reviewGone();
      return filePaths;
    });
    for (const path of paths) await this.photos.remove(accessToken, path);
    return { id: reviewId, message: 'Deleted, with its replies and photos.' };
  }
}
