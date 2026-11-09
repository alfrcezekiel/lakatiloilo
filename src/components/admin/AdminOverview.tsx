"use client";

import { ChevronRight, EyeOff, Flag, MapPin, MessageSquareText, type LucideIcon } from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminGlass } from "@/components/admin/AdminFrame";
import { AdminLoadError, adminQuerySettings, plural } from "@/components/admin/admin-ui";
import { Skeleton } from "@/components/ui/skeleton";
import {
  getAdminOverview,
  REPORT_REASON_LABELS,
  type AdminOverviewData,
} from "@/lib/api";
import { freshToken } from "@/lib/login";
import { timeAgo } from "@/lib/notifications";
import { useTableChanges } from "@/lib/realtime";
import { cn } from "@/lib/utils";

// The dashboard home (/admin, admin dashboard & moderation round, ticket
// 111): four glass stat tiles, then the 5 newest reports, each opening that
// review on the Reports screen. The numbers come from GET
// /v1/admin/overview, read as the admin, so the database decides.
//
// Live (team request 2026-11-09): Supabase Realtime rings when a review is
// added, changed or deleted, hidden or shown, or when reports are added or
// removed, and the numbers are asked again from the backend. Realtime is
// only the doorbell; the numbers always come from the backend.
const OVERVIEW_TABLES = ["reviews", "review_visibility_signals", "report_signals"] as const;

function StatTile({
  icon: Icon,
  label,
  value,
  detail,
}: {
  icon: LucideIcon;
  label: string;
  value: number;
  detail: string;
}) {
  return (
    <li className={cn(adminGlass, "flex flex-col gap-2 p-4 sm:p-5")}>
      <span className="flex items-center gap-2 text-sm font-semibold text-white/85">
        <Icon aria-hidden="true" className="size-4 shrink-0 text-amber-300" />
        {label}
      </span>
      <span className="font-fraunces text-4xl leading-none font-medium">{value}</span>
      <span className="text-xs text-white/75">{detail}</span>
    </li>
  );
}

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <p role="status" className="sr-only">
        Loading the overview
      </p>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-32 rounded-2xl" />
        ))}
      </div>
      <Skeleton className="h-72 w-full rounded-2xl" />
    </div>
  );
}

function OverviewContent({ data }: { data: AdminOverviewData }) {
  return (
    <div className="space-y-6">
      <ul aria-label="At a glance" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatTile
          icon={MessageSquareText}
          label="Reviews this week"
          value={data.reviews_this_week}
          detail="Written in the last 7 days"
        />
        <StatTile
          icon={Flag}
          label="Reports waiting"
          value={data.reports_waiting}
          detail={`On ${plural(data.reported_reviews, "review")}`}
        />
        <StatTile
          icon={EyeOff}
          label="Hidden reviews"
          value={data.hidden_reviews}
          detail="By the team or 3 reports"
        />
        <StatTile
          icon={MapPin}
          label="Places listed"
          value={data.places}
          detail="Destinations and stays"
        />
      </ul>

      <section aria-labelledby="newest-reports-heading" className={cn(adminGlass, "p-5 sm:p-6")}>
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="newest-reports-heading" className="font-fraunces text-2xl font-medium">
            Newest reports
          </h2>
          <Link
            href="/admin/reports"
            className="text-sm font-semibold text-amber-200 underline-offset-4 hover:text-amber-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            See all reports
          </Link>
        </div>

        {data.newest_reports.length === 0 ? (
          <p className="mt-4 text-white/85">No reports waiting. All clear.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {data.newest_reports.map((report) => (
              <li key={report.id}>
                {/* Opens this review on the Reports screen. A brighter
                    border on hover, never a white box. */}
                <Link
                  href={`/admin/reports#reported-${report.review_id}`}
                  className="flex min-h-11 items-center gap-3 rounded-xl border border-white/20 px-4 py-3 transition-colors hover:border-white/50 focus-visible:outline-2 focus-visible:outline-white"
                >
                  <Flag aria-hidden="true" className="size-4 shrink-0 text-amber-300" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-semibold break-words">
                      {REPORT_REASON_LABELS[report.reason] ?? report.reason}
                      <span className="font-normal text-white/80">
                        {" "}
                        · {report.reviewer_name}&apos;s review of {report.place_name}
                      </span>
                    </span>
                    {report.note && (
                      <span className="mt-0.5 block truncate text-sm text-white/80">
                        &ldquo;{report.note}&rdquo;
                      </span>
                    )}
                  </span>
                  <span className="shrink-0 text-xs text-white/70">{timeAgo(report.created_at)}</span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-white/70" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// The Overview's numbers. Called by the page itself too, so the request
// starts at once (see adminQuerySettings).
function useOverview() {
  return useQuery({
    queryKey: ["admin", "overview"],
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminOverview(token);
    },
    ...adminQuerySettings(),
  });
}

function OverviewData() {
  const overview = useOverview();
  const { refetch } = overview;
  const refresh = useCallback(() => void refetch(), [refetch]);
  useTableChanges(OVERVIEW_TABLES, refresh);

  if (overview.isPending) return <OverviewSkeleton />;
  if (overview.isError) {
    return <AdminLoadError what="the overview" error={overview.error} onRetry={() => void overview.refetch()} />;
  }
  return <OverviewContent data={overview.data} />;
}

export function AdminOverview() {
  useOverview();
  return (
    <AdminShell title="Overview" skeleton={<OverviewSkeleton />}>
      <OverviewData />
    </AdminShell>
  );
}
