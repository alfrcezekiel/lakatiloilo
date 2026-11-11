"use client";

import { Check, Flag, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminGlass } from "@/components/admin/AdminFrame";
import {
  ADMIN_LIVE_QUIET_MS,
  AdminLoadError,
  REPORTS_KEY,
  adminQuerySettings,
  plural,
} from "@/components/admin/admin-ui";
import { ModerationButtons } from "@/components/admin/ModerationButtons";
import {
  ListControls,
  Pagination,
  pageCount,
  showingText,
  type PerPage,
  type SortChoice,
} from "@/components/admin/ListControls";
import { usePendingKeys } from "@/components/admin/PendingDeletes";
import { ReviewPhotos } from "@/components/ReviewPhoto";
import { Stars, formatDate } from "@/components/ReviewsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { getAdminReports, REPORT_REASON_LABELS, type ReportedReview } from "@/lib/api";
import { freshToken } from "@/lib/login";
import { useTableChanges } from "@/lib/realtime";
import { cn } from "@/lib/utils";

// The team's Reports screen (/admin/reports, admin dashboard & moderation
// round, ticket 108): every review that travelers reported, most reports
// first, with each report's reason and note. It never shows who reported:
// the database does not let admins read that (supabase/sql/039). Each
// review has Keep it, Hide it and Delete review (ticket 109,
// ModerationButtons.tsx).
//
// Live (ticket 126): a new or removed report (report_signals, never
// review_reports itself), a review edited, hidden, shown or deleted, or
// its photos changed rings the doorbell, and the list is asked again.
const LIVE_TABLES = ["report_signals", "reviews", "review_visibility_signals", "review_photos"] as const;

// Pages and sorting (ticket 131): Recently added = newest report first;
// Most relevant = most reports; Top-rated = most stars. Ties go to the
// newest report, then the review id, so the order never jumps between
// pages. Every reported review is already loaded (up to 100), so the pages
// are made here in the browser.
const newestReport = (review: ReportedReview) =>
  review.reports.reduce((latest, report) => (report.created_at > latest ? report.created_at : latest), "");
const byNewestReport = (a: ReportedReview, b: ReportedReview) =>
  newestReport(b).localeCompare(newestReport(a)) || a.id.localeCompare(b.id);
const REPORT_SORTS: Record<SortChoice, (a: ReportedReview, b: ReportedReview) => number> = {
  recent: byNewestReport,
  relevant: (a, b) => b.report_count - a.report_count || byNewestReport(a, b),
  top: (a, b) => b.rating - a.rating || byNewestReport(a, b),
};

const placeHref = (review: ReportedReview) =>
  `/${review.place_type === "destination" ? "destinations" : "accommodations"}/${review.place_id}`;

// A small outlined label (never a white box, see
// .claude/rules/frontend.md).
const chip = "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold";

function ReportedReviewCard({
  review,
  onDone,
}: {
  review: ReportedReview;
  onDone: (message: string) => void;
}) {
  const headingId = `reported-${review.id}`;
  return (
    // tabIndex -1: a newest report on the dashboard home can move the focus
    // here (see ReportsList).
    <article
      aria-labelledby={headingId}
      tabIndex={-1}
      className={cn(adminGlass, "scroll-mt-24 p-5 sm:p-6 focus-visible:outline-2 focus-visible:outline-amber-300 focus:outline-none")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
            {review.place_type === "destination" ? "Destination" : "Accommodation"}
          </p>
          <h2 id={headingId} className="font-fraunces mt-1 text-xl leading-snug font-medium wrap-break-word">
            <Link
              href={placeHref(review)}
              className="underline-offset-4 hover:text-amber-300 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
            >
              {review.place_name}
            </Link>
          </h2>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {review.hidden ? (
            <span className={cn(chip, "border-white/40 text-white/90")}>Hidden</span>
          ) : (
            <span className={cn(chip, "border-emerald-300/60 text-emerald-200")}>Visible</span>
          )}
          <span className={cn(chip, "gap-1.5 border-amber-300/60 bg-amber-300/15 text-amber-200")}>
            <Flag aria-hidden="true" className="size-3.5" />
            {plural(review.report_count, "report")}
          </span>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/20 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href={`/travelers/${review.reviewer_id}`}
            className="font-semibold hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            {review.reviewer_name}
          </Link>
          <Stars rating={review.rating} />
          <span className="text-sm text-white/75">{formatDate(review.created_at)}</span>
        </div>
        <p className="mt-2 whitespace-pre-line wrap-break-word text-white/90">{review.comment}</p>
        {review.photos.length > 0 && (
          <div className="mt-3">
            <ReviewPhotos photos={review.photos} reviewerName={review.reviewer_name} />
          </div>
        )}
      </div>

      <h3 className="mt-5 text-sm font-semibold text-white/90">What travelers said</h3>
      <ul className="mt-2 space-y-2">
        {review.reports.map((report) => (
          <li
            key={report.id}
            className="flex flex-col gap-1 rounded-xl border border-white/15 px-4 py-3 sm:flex-row sm:items-baseline sm:gap-4"
          >
            <span className="shrink-0 font-semibold text-amber-200 sm:w-44">
              {REPORT_REASON_LABELS[report.reason] ?? report.reason}
            </span>
            <span className={cn("min-w-0 flex-1 wrap-break-word", report.note ? "text-white/90" : "text-white/70 italic")}>
              {report.note ?? "No note"}
            </span>
            <span className="shrink-0 text-sm text-white/70">{formatDate(report.created_at)}</span>
          </li>
        ))}
      </ul>

      <ModerationButtons review={review} onDone={onDone} />
    </article>
  );
}

// The reported reviews. Called by the page itself too, so the request
// starts at once (see adminQuerySettings).
function useReports() {
  return useQuery({
    queryKey: REPORTS_KEY,
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminReports(token);
    },
    ...adminQuerySettings(),
  });
}

function ReportsSkeleton() {
  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">
        Loading reports
      </p>
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-64 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function ReportsList() {
  // What the last Keep it / Hide it / Delete review did. Focus moves to
  // it, so keyboard and screen reader users are not lost when a card
  // leaves the list.
  const [done, setDone] = useState<string | null>(null);
  const doneLine = useRef<HTMLParagraphElement>(null);
  const announce = (message: string) => {
    setDone(message);
    requestAnimationFrame(() => doneLine.current?.focus());
  };

  const reports = useReports();
  const pendingKeys = usePendingKeys();
  // Pages and sorting (ticket 131). Reports open on Most relevant (most
  // reports first), the order this screen always had.
  const [sort, setSortOnly] = useState<SortChoice>("relevant");
  const [perPage, setPerPageOnly] = useState<PerPage>(10);
  // null: not chosen yet, so a link to one reported review
  // ("#reported-<id>", from the Overview) opens the page it is on.
  const [page, setPage] = useState<number | null>(null);
  const statusLine = useRef<HTMLParagraphElement>(null);
  const { refetch } = reports;
  const refresh = useCallback(() => void refetch(), [refetch]);
  useTableChanges(LIVE_TABLES, refresh, { quietMs: ADMIN_LIVE_QUIET_MS });

  // Opened from a newest report on the dashboard home (ticket 111):
  // "#reported-<review id>". The list arrives after the page opens, so the
  // browser cannot jump there by itself: once it is on screen, scroll to
  // that review and move the focus to it, once.
  const jumped = useRef(false);
  useEffect(() => {
    if (jumped.current || !reports.data) return;
    jumped.current = true;
    const target = window.location.hash.slice(1);
    if (!target.startsWith("reported-")) return;
    const card = document.getElementById(target)?.closest("article");
    if (!card) return;
    card.scrollIntoView({ block: "start" });
    card.focus({ preventScroll: true });
  }, [reports.data]);

  if (reports.isPending) return <ReportsSkeleton />;

  if (reports.isError) {
    return (
      <AdminLoadError what="the reports" error={reports.error} onRetry={() => void reports.refetch()} />
    );
  }

  // Reviews waiting for Undo (ticket 127) are left out.
  const list = reports.data
    .filter((review) => !pendingKeys.has(`review:${review.id}`))
    .sort(REPORT_SORTS[sort]);
  const pages = pageCount(list.length, perPage);
  const linked = typeof window === "undefined" ? "" : window.location.hash.slice("#reported-".length);
  const linkedIndex = page === null && linked ? list.findIndex((review) => review.id === linked) : -1;
  const startPage = linkedIndex >= 0 ? Math.floor(linkedIndex / perPage) + 1 : 1;
  // A delete can empty the last page: show the one before it.
  const current = Math.min(page ?? startPage, pages);
  const onPage = list.slice((current - 1) * perPage, current * perPage);
  const goTo = (next: number) => {
    setPage(next);
    requestAnimationFrame(() => {
      statusLine.current?.focus({ preventScroll: true });
      statusLine.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p
          ref={statusLine}
          tabIndex={-1}
          role="status"
          className="scroll-mt-24 text-white/85 focus:outline-none"
        >
          {list.length === 0
            ? "No reports waiting."
            : showingText(current, perPage, list.length, list.length === 1 ? "reported review" : "reported reviews")}
        </p>
        <button
          type="button"
          onClick={() => void reports.refetch()}
          disabled={reports.isFetching}
          className="inline-flex min-h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-white/40 px-4 text-sm font-semibold hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-70 sm:w-auto"
        >
          {reports.isFetching ? <Spinner /> : <RefreshCw aria-hidden="true" className="size-4" />}
          {reports.isFetching ? "Checking…" : "Check for new reports"}
        </button>
      </div>

      {done && (
        <p
          ref={doneLine}
          tabIndex={-1}
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-300/50 px-4 py-3 text-emerald-100 focus-visible:outline-2 focus-visible:outline-white"
        >
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {done}
        </p>
      )}

      {list.length > 0 && (
        <ListControls
          sort={sort}
          onSort={(next) => {
            setSortOnly(next);
            setPage(1);
          }}
          perPage={perPage}
          onPerPage={(next) => {
            setPerPageOnly(next);
            setPage(1);
          }}
        />
      )}

      {list.length === 0 ? (
        <div className={cn(adminGlass, "p-6 sm:p-8")}>
          <p className="font-fraunces text-2xl font-medium">All clear</p>
          <p className="mt-1 text-white/85">
            When travelers report a review, it shows up here with their reasons.
          </p>
        </div>
      ) : (
        onPage.map((review) => <ReportedReviewCard key={review.id} review={review} onDone={announce} />)
      )}

      <Pagination page={current} pages={pages} onPage={goTo} label="Pages of reported reviews" />
    </div>
  );
}

export function AdminReports() {
  useReports();
  return (
    <AdminShell title="Reports" skeleton={<ReportsSkeleton />}>
      <ReportsList />
    </AdminShell>
  );
}
