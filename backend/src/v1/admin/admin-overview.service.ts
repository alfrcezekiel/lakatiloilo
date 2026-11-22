import { HttpException, Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import type { QueryRunner } from 'typeorm';
import { TravelerTransactions } from '../traveler-transactions';

// One of the newest reports on the dashboard home. Never who sent it (the
// database does not let admins read that, supabase/sql/039).
export interface NewestReportDto {
  id: string;
  review_id: string;
  reason: string;
  note: string | null;
  created_at: Date;
  place_name: string;
  reviewer_name: string;
}

// The dashboard home's numbers (ticket 111).
export interface OverviewDto {
  // Reviews written in the last 7 days, hidden ones included.
  reviews_this_week: number;
  // Reports the team has not dealt with yet (Keep it and Delete review
  // remove them), and how many reviews they are on.
  reports_waiting: number;
  reported_reviews: number;
  // Reviews hidden by the team or by three reports.
  hidden_reviews: number;
  // Destinations and accommodations on the site.
  places: number;
  newest_reports: NewestReportDto[];
  // Storage used (ticket 167, supabase/sql/067): every file in the project,
  // in bytes, against the free plan's 1 GB; null when it could not be read
  // (the rest of the Overview still shows).
  storage: StorageUsedDto | null;
}

export interface StorageUsedDto {
  used_bytes: number;
  limit_bytes: number;
  // The three buckets the app fills.
  place_photos_bytes: number;
  review_photos_bytes: number;
  review_videos_bytes: number;
}

// Supabase's free plan: 1 GB of files for the whole project.
export const STORAGE_LIMIT_BYTES = 1024 * 1024 * 1024;

// How many of the newest reports the home shows.
const NEWEST = 5;

// The dashboard home (admin dashboard & moderation round, ticket 111).
// Read AS the signed-in admin (TravelerTransactions), so Row Level
// Security decides: only admins may read reports and hidden reviews
// (039, 040). Admin-only routes check is_admin() first as well
// (AdminOnlyMiddleware).
@Injectable()
export class AdminOverviewService {
  private readonly logger = new Logger(AdminOverviewService.name);

  constructor(private readonly travelerTransactions: TravelerTransactions) { }

  // Storage used, from the admin-only function in 067. Inside a savepoint:
  // if it fails, only that step is undone, the transaction goes on, and the
  // Overview shows everything else.
  private async storageUsed(runner: QueryRunner): Promise<StorageUsedDto | null> {
    await runner.query('savepoint storage_used');
    try {
      const [{ storage }]: { storage: Record<string, string | number> }[] = await runner.query(
        'select public.admin_storage_used() as storage',
      );
      await runner.query('release savepoint storage_used');
      // Sums arrive from Postgres as text (bigint); turn them into numbers.
      return {
        used_bytes: Number(storage.total),
        limit_bytes: STORAGE_LIMIT_BYTES,
        place_photos_bytes: Number(storage.place_photos),
        review_photos_bytes: Number(storage.review_photos),
        review_videos_bytes: Number(storage.review_videos),
      };
    } catch (error) {
      await runner.query('rollback to savepoint storage_used');
      this.logger.warn(`Could not read storage used: ${String(error)}`);
      return null;
    }
  }

  overview(accessToken: string): Promise<OverviewDto> {
    return this.travelerTransactions.run(
      accessToken,
      async (runner) => {
        const [counts]: Omit<OverviewDto, 'newest_reports' | 'storage'>[] = await runner.query(
          `select
                (select count(*)::int from public.reviews
                  where created_at >= now() - interval '7 days') as reviews_this_week,
                -- Only reports on reviews the admin can see: one in the
                -- Trash (060, 061) is left out, as on the Reports screen
                -- (code review 2026-11-15).
                (select count(*)::int from public.review_reports rr
                   join public.reviews r on r.id = rr.review_id) as reports_waiting,
                (select count(distinct rr.review_id)::int from public.review_reports rr
                   join public.reviews r on r.id = rr.review_id) as reported_reviews,
                (select count(*)::int from public.reviews where hidden_at is not null) as hidden_reviews,
                (select count(*)::int from public.destinations)
                  + (select count(*)::int from public.accommodations) as places`,
        );
        const newest: NewestReportDto[] = await runner.query(
          `select rr.id, rr.review_id, rr.reason, rr.note, rr.created_at,
                      coalesce(d.name, a.name, 'a place') as place_name, r.reviewer_name
                      from public.review_reports rr
                      join public.reviews r on r.id = rr.review_id
                      left join public.destinations d
                              on r.place_type = 'destination' and d.id = r.place_id
                      left join public.accommodations a
                              on r.place_type = 'accommodation' and a.id = r.place_id
                order by rr.created_at desc
                limit $1`,
          [NEWEST],
        );
        return { ...counts, newest_reports: newest, storage: await this.storageUsed(runner) };
      },
      (error) => {
        if (error instanceof HttpException) return error;
        this.logger.error(`Could not load the overview: ${String(error)}`);
        return new ServiceUnavailableException('Something went wrong. Please try again.');
      },
    );
  }
}
