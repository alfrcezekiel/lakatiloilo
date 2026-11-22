"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getReviews, type Review } from "@/lib/api";
import { useTableChanges } from "@/lib/realtime";
import { loginToken, useCurrentUser } from "@/lib/login";
import { Fact, StatTile } from "@/components/PlaceDetail";

type PlaceType = "destination" | "accommodation";
type Place = { placeType: PlaceType; placeId: string };

// A "context" is React's way of sharing data with every component inside a
// wrapper without passing it down by hand. Here it only shares WHICH place
// the page is about; the reviews themselves live in TanStack Query's cache
// (src/components/Providers.tsx). So the Rating tile at the top and the
// Reviews section further down read the same list, and update together.
const PlaceContext = createContext<Place | null>(null);

// Live updates (ticket 89): when any review, Helpful mark or reply changes
// anywhere, Supabase Realtime rings and this place's reviews are fetched
// again from the backend, so other travelers' changes show without a
// reload. Listened to once per page, here, not in every component that
// reads the reviews. (Realtime cannot tell which place a deleted row
// belonged to, so it listens to all of them; a refetch is one small
// request.) Helpful marks on replies too (reply_likes, ticket 96), and a
// review being hidden or shown again (review_visibility_signals, ticket 109).
const REVIEW_TABLES = [
  "reviews",
  "review_likes",
  "review_replies",
  "reply_likes",
  "review_visibility_signals",
  "review_photos",
] as const;

export function PlaceReviewsProvider({
  placeType,
  placeId,
  children,
}: Place & { children: ReactNode }) {
  const queryClient = useQueryClient();
  const refetchReviews = useCallback(() => {
    // Fetches the copy on screen again; copies kept for other travelers
    // are only marked out of date.
    void queryClient.invalidateQueries({ queryKey: ["reviews", placeType, placeId] });
  }, [queryClient, placeType, placeId]);
  // TanStack Query already fetches the reviews again when the tab comes
  // back or the browser is online again, so only a Realtime reconnect
  // rings here (ticket 92).
  // 0.2 s instead of 0.5 s after the last change, so a Helpful mark (or
  // the team removing one) shows sooner (team report 2026-11-11).
  useTableChanges(REVIEW_TABLES, refetchReviews, { catchUpOnReturn: false, quietMs: 200 });

  return (
    <PlaceContext.Provider value={{ placeType, placeId }}>{children}</PlaceContext.Provider>
  );
}

// The cache's label for one place's reviews, as seen by one traveler
// ("anon" when logged out). Same label = same copy. The traveler is part
// of the label because each copy says which reviews THEY marked
// "Helpful" (profiles & likes round), so one traveler's marks can never
// show for another after logging in or out.
const reviewsKey = (placeType: PlaceType, placeId: string, viewer: string) =>
  ["reviews", placeType, placeId, viewer] as const;

export function usePlaceReviews() {
  const place = useContext(PlaceContext);
  if (!place) {
    throw new Error("usePlaceReviews must be used inside <PlaceReviewsProvider>.");
  }
  const { placeType, placeId } = place;
  const queryClient = useQueryClient();
  const { user, ready } = useCurrentUser();
  const viewer = user?.id ?? "anon";

  // From the NestJS backend (GET /v1/reviews), newest first, with the
  // traveler's login when there is one. If this place was opened in the
  // last minute, the cached copy shows at once and a fresh one replaces it
  // when it arrives.
  //
  // enabled: ready waits until "who is logged in" is known, so the reviews
  // are fetched once, for the right traveler. Before, a logged-in traveler's
  // first visit fetched them twice (as logged out, then with the login), and
  // the Helpful button could show unmarked for a moment before turning
  // amber. Logged out, "ready" is true at once, so nothing waits; logged in,
  // the answer is remembered between pages (navigation round).
  // placeholderData keeps the list on screen when logging in or out.
  const query = useQuery({
    queryKey: reviewsKey(placeType, placeId, viewer),
    queryFn: async () => getReviews(placeType, placeId, user ? await loginToken() : null),
    enabled: ready,
    placeholderData: (previous) => previous,
  });

  // After a traveler writes, edits or deletes a review, the backend's
  // answer is put straight into the cached copy, so every part of the page
  // shows the change at once without asking the backend again.
  //
  // It also calls router.refresh(), which makes Next.js forget the pages it
  // kept from earlier in this visit. Without it, pressing the browser's Back
  // button showed the home page from before, with the card's old rating
  // (buttons & cards round). The page on screen stays as it is. A "Helpful"
  // mark does not change any rating, so it passes refreshPages: false.
  //
  // Copies of this place kept for other travelers (from before logging in
  // or out) are marked out of date, so they are fetched again if used.
  const router = useRouter();
  const setReviews = useCallback(
    (update: (current: Review[]) => Review[], { refreshPages = true } = {}) => {
      queryClient.setQueryData<Review[]>(reviewsKey(placeType, placeId, viewer), (current) =>
        update(current ?? []),
      );
      queryClient.invalidateQueries({
        queryKey: ["reviews", placeType, placeId],
        predicate: (q) => q.queryKey[3] !== viewer,
        refetchType: "none",
      });
      if (refreshPages) router.refresh();
    },
    [queryClient, placeType, placeId, viewer, router],
  );

  return {
    placeType,
    placeId,
    // null while loading for the first time.
    reviews: query.data ?? null,
    // Only an error when there is nothing to show: if a background refresh
    // fails, travelers keep seeing the copy they already have.
    loadError: query.isError && !query.data,
    setReviews,
  };
}

// Worked out from the reviews themselves, so the database needs no extra
// columns to keep in step. null when there are no reviews yet.
// The reviews that count toward the rating: everything except the
// traveler's own review while the team has it hidden (ticket 109).
export const countedReviews = (reviews: Review[]) => reviews.filter((r) => !r.hidden);

export function averageRating(reviews: Review[]) {
  const counted = countedReviews(reviews);
  return counted.length > 0
    ? counted.reduce((sum, r) => sum + r.rating, 0) / counted.length
    : null;
}

// The Rating tile at the top of a detail page: "★ 4.7 · 2 reviews".
export function RatingTile() {
  const { reviews, loadError } = usePlaceReviews();
  const average = reviews ? averageRating(reviews) : null;

  return (
    <StatTile label="Rating">
      {loadError ? (
        <span className="text-white/70">Not available</span>
      ) : reviews === null ? (
        <span className="text-white/70">Loading…</span>
      ) : average === null ? (
        <span className="text-white/70">No reviews yet</span>
      ) : (
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span aria-hidden="true" className="text-amber-300">
            ★
          </span>
          <span>{average.toFixed(1)}</span>
          <span className="text-xs font-normal text-white/65">
            {countedReviews(reviews).length} review
            {countedReviews(reviews).length === 1 ? "" : "s"}
          </span>
        </span>
      )}
    </StatTile>
  );
}

// The Rating fact in the glass strip over the photo (glass detail pages
// round): the same four states as RatingTile, in the new QuickFacts look.
export function RatingFact() {
  const { reviews, loadError } = usePlaceReviews();
  const average = reviews ? averageRating(reviews) : null;
  const count = reviews ? countedReviews(reviews).length : 0;

  return (
    <Fact label="Rating">
      {loadError ? (
        <span className="font-normal text-white/80">Not available</span>
      ) : reviews === null ? (
        <span className="font-normal text-white/80">Loading…</span>
      ) : average === null ? (
        <span className="font-normal text-white/80">No reviews yet</span>
      ) : (
        <span className="flex flex-wrap items-baseline gap-x-1.5">
          <span aria-hidden="true" className="text-accent">
            ★
          </span>
          <span>{average.toFixed(1)}</span>
          <span className="text-sm font-normal text-white/80">
            · {count} review{count === 1 ? "" : "s"}
          </span>
        </span>
      )}
    </Fact>
  );
}

// The rating summary at the top of Reviews: the big average and how many
// reviews gave each star, 5 down to 1. Only the reviews that count
// (countedReviews), so a hidden review never moves the bars.
export function RatingSummary({ reviews }: { reviews: Review[] }) {
  const counted = countedReviews(reviews);
  const average = averageRating(reviews);
  if (average === null || counted.length === 0) return null;

  const bars = [5, 4, 3, 2, 1].map((star) => {
    const n = counted.filter((r) => Math.round(r.rating) === star).length;
    return { star, n, pct: (n / counted.length) * 100 };
  });

  return (
    <div className="glass flex flex-wrap items-center gap-8 rounded-3xl border border-white/20 bg-white/10 p-6 text-white sm:p-7">
      <div className="shrink-0">
        <p className="font-fraunces text-7xl font-medium leading-none">{average.toFixed(1)}</p>
        <p aria-hidden="true" className="mt-2 text-lg tracking-[0.15em] text-accent">
          {"★★★★★".slice(0, Math.round(average))}
          <span className="text-white/30">{"★★★★★".slice(Math.round(average))}</span>
        </p>
        <p className="mt-1 text-sm text-white/80">
          <span className="sr-only">Average {average.toFixed(1)} out of 5 from </span>
          {counted.length} review{counted.length === 1 ? "" : "s"}
        </p>
      </div>
      <dl className="min-w-56 flex-1 space-y-2 text-sm">
        {bars.map((b) => (
          <div key={b.star} className="flex items-center gap-2.5">
            <dt className="w-12 shrink-0 text-white/90">
              {b.star} star{b.star === 1 ? "" : "s"}
            </dt>
            <dd className="h-2 flex-1 overflow-hidden rounded-full bg-white/15" aria-hidden="true">
              <div className="h-full rounded-full bg-accent" style={{ width: `${b.pct}%` }} />
            </dd>
            <dd className="w-8 shrink-0 text-right text-white/80">{b.n}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
