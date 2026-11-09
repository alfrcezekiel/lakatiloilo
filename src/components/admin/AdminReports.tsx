"use client";

import { Check, Flag, RefreshCw } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminGlass } from "@/components/admin/AdminFrame";
import { AdminLoadError, REPORTS_KEY, plural } from "@/components/admin/admin-ui";
import { ModerationButtons } from "@/components/admin/ModerationButtons";
import { ReviewPhotos } from "@/components/ReviewPhoto";
import { Stars, formatDate } from "@/components/ReviewsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { getAdminReports, REPORT_REASON_LABELS, type ReportedReview } from "@/lib/api";
import { freshToken } from "@/lib/login";
import { cn } from "@/lib/utils";

// The team's Reports screen (/admin/reports, admin dashboard & moderation
// round, ticket 108): every review that travelers reported, most reports
// first, with each report's reason and note. It never shows who reported:
// the database does not let admins read that (supabase/sql/039). Each
// review has Keep it, Hide it and Delete review (ticket 109,
// ModerationButtons.tsx).

const placeHref = (review: ReportedReview) =>
  `/${review.place_type === "destination" ? "destinations" : "accommodations"}/${review.place_id}`;

// A small outlined label (never a white box, see
// .claude/rules/no-white-hover-backdrop.md).
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
      className={cn(adminGlass, "scroll-mt-24 p-5 sm:p-6 focus:outline-2 focus:outline-amber-300")}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-white/75">
            {review.place_type === "destination" ? "Destination" : "Accommodation"}
          </p>
          <h2 id={headingId} className="font-fraunces mt-1 text-xl leading-snug font-medium break-words">
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
        <p className="mt-2 whitespace-pre-line break-words text-white/90">{review.comment}</p>
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
            <span className={cn("min-w-0 flex-1 break-words", report.note ? "text-white/90" : "text-white/70 italic")}>
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

  const reports = useQuery({
    queryKey: REPORTS_KEY,
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminReports(token);
    },
  });

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

  const list = reports.data;
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p role="status" className="text-white/85">
          {list.length === 0
            ? "No reports waiting."
            : `${plural(list.length, "reported review")}, most reports first.`}
        </p>
        <button
          type="button"
          onClick={() => void reports.refetch()}
          disabled={reports.isFetching}
          className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-xl border border-white/40 px-4 text-sm font-semibold hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white disabled:cursor-default disabled:opacity-70"
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

      {list.length === 0 ? (
        <div className={cn(adminGlass, "p-6 sm:p-8")}>
          <p className="font-fraunces text-2xl font-medium">All clear</p>
          <p className="mt-1 text-white/85">
            When travelers report a review, it shows up here with their reasons.
          </p>
        </div>
      ) : (
        list.map((review) => <ReportedReviewCard key={review.id} review={review} onDone={announce} />)
      )}
    </div>
  );
}

export function AdminReports() {
  return (
    <AdminShell title="Reports">
      <ReportsList />
    </AdminShell>
  );
}
