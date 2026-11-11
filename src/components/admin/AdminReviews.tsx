"use client";

import { Check, ChevronDown, Flag, MessageSquare, Search, X } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { keepPreviousData, useQuery, useQueryClient } from "@tanstack/react-query";
import { AdminShell } from "@/components/admin/AdminShell";
import { adminGlass } from "@/components/admin/AdminFrame";
import { HelpfulCount } from "@/components/admin/AdminLikes";
import { AdminReplies } from "@/components/admin/AdminReplies";
import {
  ListControls,
  Pagination,
  pageCount,
  showingText,
  type PerPage,
  type SortChoice,
} from "@/components/admin/ListControls";
import { usePendingKeys } from "@/components/admin/PendingDeletes";
import { ReviewActions, type OnDone } from "@/components/admin/ReviewActions";
import {
  ADMIN_LIVE_QUIET_MS,
  ADMIN_REVIEWS_KEY,
  AdminLoadError,
  adminQuerySettings,
  plural,
} from "@/components/admin/admin-ui";
import { ReviewPhotos } from "@/components/ReviewPhoto";
import { Stars, formatDate } from "@/components/ReviewsSection";
import { Skeleton } from "@/components/ui/skeleton";
import { Spinner } from "@/components/ui/spinner";
import { getAdminReviews, type AdminReview, type AdminReviewFilter } from "@/lib/api";
import { freshToken } from "@/lib/login";
import { useTableChanges } from "@/lib/realtime";
import { cn } from "@/lib/utils";

// The team's Reviews screen (/admin/reviews, full admin management round,
// ticket 122): every review, hidden ones too, newest first, 50 at a time
// with "Show more". A search box (review text, reviewer's name or place)
// and All / Hidden / Reported. Each review shows its place, reviewer,
// stars, text, photos, Helpful count, replies, reports and Visible or
// Hidden. Hide it / Show it and Delete review (ticket 123); Show replies
// with Delete reply (124); "N Helpful" opens who marked it, with Remove
// (125).


// Live (ticket 126, sped up after the team's report of 2026-11-11: a
// traveler's Helpful mark did not show on the dashboard). Every change to
// a review, reply, Helpful mark or photo, a review hidden or shown, or a
// report added or removed rings this doorbell; then the open lists ask the
// backend again: the reviews (every loaded page), open replies and open
// Helpful lists. Realtime never sends the data itself, and review_reports
// is never listened to (report_signals instead). What the admin is doing
// stays: the search, the filter, open panels and an open pop-up live in
// the cards, which stay on screen.
const LIVE_TABLES = [
  "reviews",
  "review_replies",
  "review_likes",
  "reply_likes",
  "review_photos",
  "review_visibility_signals",
  "report_signals",
] as const;

const FILTERS: { id: AdminReviewFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "hidden", label: "Hidden" },
  { id: "reported", label: "Reported" },
];

// Typing waits this long before asking the backend, so every key press
// is not a request.
const SEARCH_WAIT_MS = 300;

const placeHref = (review: AdminReview) =>
  `/${review.place_type === "destination" ? "destinations" : "accommodations"}/${review.place_id}`;

// A small outlined label (never a white box, see
// .claude/rules/frontend.md).
const chip = "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold";

function ReviewCard({ review, onDone }: { review: AdminReview; onDone: OnDone }) {
  const [repliesOpen, setRepliesOpen] = useState(false);
  const headingId = `review-${review.id}`;
  return (
    // tabIndex -1: after "Show more" the focus moves to the first new one.
    <article
      aria-labelledby={headingId}
      tabIndex={-1}
      data-review-id={review.id}
      className={cn(adminGlass, "p-5 focus-visible:outline-2 focus-visible:outline-amber-300 focus:outline-none sm:p-6")}
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
          {review.report_count > 0 && (
            <span className={cn(chip, "border-amber-300/60 bg-amber-300/15 text-amber-200")}>
              <Flag aria-hidden="true" className="size-3.5" />
              {plural(review.report_count, "report")}
            </span>
          )}
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-white/20 p-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <Link
            href={`/travelers/${review.reviewer_id}`}
            className="font-semibold wrap-break-word hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
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

      {/* N Helpful (ticket 125) and the replies (124) side by side; what
          they open goes under the whole row. Phones: two equal halves, like
          Hide it / Delete review under them (team report 2026-11-11: the
          buttons made uneven rows at 425, 375 and 320 px). */}
      <HelpfulCount
        kind="review"
        id={review.id}
        count={review.helpful_count}
        layout={(helpfulButton, likersList) => (
          <>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
              {helpfulButton}
              {review.reply_count > 0 || repliesOpen ? (
                <button
                  type="button"
                  onClick={() => setRepliesOpen((open) => !open)}
                  aria-expanded={repliesOpen}
                  aria-controls={`replies-${review.id}`}
                  className="inline-flex min-h-11 cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-white/40 px-3 text-center text-sm leading-tight font-semibold hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <MessageSquare aria-hidden="true" className="size-4 shrink-0" />
                  {repliesOpen ? "Hide replies" : `Replies (${review.reply_count})`}
                  <span className="sr-only">{repliesOpen ? "" : ": show them"}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className={cn("hidden size-4 shrink-0 transition-transform sm:block", repliesOpen && "rotate-180")}
                  />
                </button>
              ) : (
                <span className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-xl border border-white/15 px-3 text-sm text-white/75">
                  <MessageSquare aria-hidden="true" className="size-4" />0 replies
                </span>
              )}
            </div>
            {likersList}
            {repliesOpen && <AdminReplies reviewId={review.id} id={`replies-${review.id}`} />}
          </>
        )}
      />

      <ReviewActions review={review} onDone={onDone} />
    </article>
  );
}

// The list for one search and filter, page by page. Called by the page
// itself too (with no search), so the first request starts at once.
type ReviewsView = { q: string; show: AdminReviewFilter; sort: SortChoice; perPage: PerPage; page: number };
const FIRST_VIEW: ReviewsView = { q: "", show: "all", sort: "recent", perPage: 10, page: 1 };

// One numbered page for one search, filter, sort and size (ticket 130).
// Called by the page itself too (first page), so the request starts at
// once.
function useReviews(view: ReviewsView) {
  return useQuery({
    queryKey: [...ADMIN_REVIEWS_KEY, view.q, view.show, view.sort, view.perPage, view.page],
    queryFn: async () => {
      const token = await freshToken();
      if (!token) throw new Error("Please log in again, then try again.");
      return getAdminReviews(token, view);
    },
    // A new search, sort or page keeps the old one on screen until the
    // answer comes.
    placeholderData: keepPreviousData,
    ...adminQuerySettings(),
  });
}

function ReviewsSkeleton() {
  return (
    <div className="space-y-4">
      <p role="status" className="sr-only">
        Loading reviews
      </p>
      <Skeleton className="h-36 w-full rounded-2xl" />
      <Skeleton className="h-5 w-48" />
      {[0, 1].map((i) => (
        <Skeleton key={i} className="h-56 w-full rounded-2xl" />
      ))}
    </div>
  );
}

function ReviewsList() {
  const [text, setText] = useState("");
  const [view, setView] = useState<ReviewsView>(FIRST_VIEW);
  const { q, show, sort, perPage } = view;
  // A new search, filter, sort or number per page starts at page 1.
  const change = (next: Partial<Omit<ReviewsView, "page">>) => setView((v) => ({ ...v, ...next, page: 1 }));
  useEffect(() => {
    const timer = setTimeout(
      () => setView((v) => (v.q === text.trim() ? v : { ...v, q: text.trim(), page: 1 })),
      SEARCH_WAIT_MS,
    );
    return () => clearTimeout(timer);
  }, [text]);

  const reviews = useReviews(view);

  const queryClient = useQueryClient();
  const refreshAll = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEY });
    void queryClient.invalidateQueries({ queryKey: ["admin", "replies"] });
    void queryClient.invalidateQueries({ queryKey: ["admin", "likers"] });
  }, [queryClient]);
  useTableChanges(LIVE_TABLES, refreshAll, { quietMs: ADMIN_LIVE_QUIET_MS });

  // What the last Hide it / Show it did (a delete shows the Undo line
  // instead, ticket 127). The focus stays on the button, which stays.
  const [done, setDone] = useState<string | null>(null);
  // Reviews waiting for Undo (ticket 127) are left out.
  const pendingKeys = usePendingKeys();
  const loaded = reviews.data?.reviews ?? [];
  const list = loaded.filter((review) => !pendingKeys.has(`review:${review.id}`));
  const total = (reviews.data?.total ?? 0) - (loaded.length - list.length);
  const pages = pageCount(total, perPage);
  // The page shown (the answer's, while a new one is on its way).
  const current = reviews.data?.page ?? view.page;

  // A delete (or another window) can leave this page past the end.
  const pastTheEnd = list.length === 0 && total > 0 && current > pages;

  // Moving to another page: the line "Showing 11–20 of 170" gets the
  // focus, so keyboard and screen reader users start at the top of it.
  const statusLine = useRef<HTMLParagraphElement>(null);
  const goTo = (page: number) => {
    setView((v) => ({ ...v, page }));
    requestAnimationFrame(() => {
      statusLine.current?.focus({ preventScroll: true });
      statusLine.current?.scrollIntoView({ block: "start", behavior: "smooth" });
    });
  };

  if (reviews.isPending) return <ReviewsSkeleton />;
  if (reviews.isError && !reviews.data) {
    return <AdminLoadError what="the reviews" error={reviews.error} onRetry={() => void reviews.refetch()} />;
  }

  const narrowed = q !== "" || show !== "all";
  // True only while a new search, filter, sort or page is on its way (the
  // old one is still shown), not for a quiet refresh in the background.
  const searching = reviews.isPlaceholderData;

  return (
    <div className="space-y-4">
      <div className={cn(adminGlass, "space-y-3 p-4 sm:p-5")}>
        <label htmlFor="review-search" className="text-sm font-semibold">
          Find a review
        </label>
        {/* A bordered box that brightens when typing, never a white fill. */}
        <div className="flex items-center gap-2 rounded-xl border border-white/45 px-3 focus-within:border-white/90">
          {searching ? <Spinner /> : <Search aria-hidden="true" className="size-4 shrink-0 text-white/75" />}
          <input
            id="review-search"
            type="search"
            value={text}
            onChange={(e) => setText(e.target.value)}
            maxLength={100}
            placeholder="Review text, reviewer or place"
            autoComplete="off"
            className="min-h-11 w-full min-w-0 bg-transparent text-base text-white placeholder:text-white/70 focus:outline-none [&::-webkit-search-cancel-button]:appearance-none [&::-webkit-search-decoration]:appearance-none"
          />
          {text && (
            <button
              type="button"
              onClick={() => setText("")}
              aria-label="Clear search"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-lg text-white/80 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
            >
              <X aria-hidden="true" className="size-4" />
            </button>
          )}
        </div>
        {/* Phones: one full row; from 640 px a row of pills. */}
        <div role="group" aria-label="Show" className="flex gap-2 sm:flex-wrap">
          {FILTERS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => change({ show: id })}
              aria-pressed={show === id}
              className={cn(
                "min-h-11 min-w-11 flex-auto cursor-pointer rounded-full border px-3 text-sm font-semibold whitespace-nowrap transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:flex-none sm:px-4",
                show === id
                  ? "border-white bg-white text-teal-900"
                  : "border-white/40 text-white/85 hover:text-white",
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <ListControls
        sort={sort}
        onSort={(next) => change({ sort: next })}
        perPage={perPage}
        onPerPage={(next) => change({ perPage: next })}
      />

      <p
        ref={statusLine}
        tabIndex={-1}
        role="status"
        className="scroll-mt-24 text-white/85 focus:outline-none"
      >
        {searching
          ? "Loading…"
          : pastTheEnd
            ? `Page ${current} is empty now; there are ${pages} pages.`
            : total === 0
            ? narrowed
              ? "No reviews match."
              : "No reviews yet."
            : showingText(current, perPage, total, total === 1 ? "review" : "reviews").replace(
                /\.$/,
                narrowed ? " that match." : ".",
              )}
      </p>

      {done && (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl border border-emerald-300/50 px-4 py-3 text-emerald-100"
        >
          <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          <span className="min-w-0 flex-1 wrap-break-word">{done}</span>
          <button
            type="button"
            onClick={() => setDone(null)}
            aria-label="Dismiss"
            className="flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-lg hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-white"
          >
            <X aria-hidden="true" className="size-4" />
          </button>
        </p>
      )}

      {reviews.isError && (
        <AdminLoadError what="the reviews" error={reviews.error} onRetry={() => void reviews.refetch()} />
      )}

      {pastTheEnd ? (
        <div className={cn(adminGlass, "p-6")}>
          <p className="font-semibold">This page is empty now.</p>
          <button
            type="button"
            onClick={() => goTo(pages)}
            className="mt-3 inline-flex min-h-11 cursor-pointer items-center rounded-full border border-white/50 px-5 font-semibold hover:border-amber-300 hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
          >
            Go to page {pages}
          </button>
        </div>
      ) : list.length === 0 ? (
        <div className={cn(adminGlass, "p-6")}>
          <p className="font-semibold">{narrowed ? "No reviews match." : "No reviews yet."}</p>
          {narrowed && <p className="mt-1 text-white/85">Try another word, or show all reviews.</p>}
        </div>
      ) : (
        <div className={cn("space-y-4", searching && "opacity-70")}>
          {list.map((review) => (
            <ReviewCard key={review.id} review={review} onDone={setDone} />
          ))}
        </div>
      )}

      <Pagination page={current} pages={pages} onPage={goTo} label="Pages of reviews" />
    </div>
  );
}

export function AdminReviews() {
  useReviews(FIRST_VIEW);
  return (
    <AdminShell title="Reviews" skeleton={<ReviewsSkeleton />}>
      <ReviewsList />
    </AdminShell>
  );
}
