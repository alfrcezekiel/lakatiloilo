"use client";

import { createContext, useCallback, useContext, type ReactNode } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { getReviews, type Review } from "@/lib/api";
import { StatTile } from "@/components/PlaceDetail";

type PlaceType = "destination" | "accommodation";
type Place = { placeType: PlaceType; placeId: string };

// A "context" is React's way of sharing data with every component inside a
// wrapper without passing it down by hand. Here it only shares WHICH place
// the page is about; the reviews themselves live in TanStack Query's cache
// (src/components/Providers.tsx). So the Rating tile at the top and the
// Reviews section further down read the same list, and update together.
const PlaceContext = createContext<Place | null>(null);

export function PlaceReviewsProvider({
  placeType,
  placeId,
  children,
}: Place & { children: ReactNode }) {
  return (
    <PlaceContext.Provider value={{ placeType, placeId }}>{children}</PlaceContext.Provider>
  );
}

// The cache's label for one place's reviews. Same label = same copy.
const reviewsKey = (placeType: PlaceType, placeId: string) =>
  ["reviews", placeType, placeId] as const;

export function usePlaceReviews() {
  const place = useContext(PlaceContext);
  if (!place) {
    throw new Error("usePlaceReviews must be used inside <PlaceReviewsProvider>.");
  }
  const { placeType, placeId } = place;
  const queryClient = useQueryClient();

  // From the NestJS backend (GET /v1/reviews), newest first. If this place
  // was opened in the last minute, the cached copy shows at once and a
  // fresh one replaces it when it arrives.
  const query = useQuery({
    queryKey: reviewsKey(placeType, placeId),
    queryFn: () => getReviews(placeType, placeId),
  });

  // After a traveler writes, edits or deletes a review, the backend's
  // answer is put straight into the cached copy, so every part of the page
  // shows the change at once without asking the backend again.
  //
  // It also calls router.refresh(), which makes Next.js forget the pages it
  // kept from earlier in this visit. Without it, pressing the browser's Back
  // button showed the home page from before, with the card's old rating
  // (buttons & cards round). The page on screen stays as it is.
  const router = useRouter();
  const setReviews = useCallback(
    (update: (current: Review[]) => Review[]) => {
      queryClient.setQueryData<Review[]>(reviewsKey(placeType, placeId), (current) =>
        update(current ?? []),
      );
      router.refresh();
    },
    [queryClient, placeType, placeId, router],
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
export function averageRating(reviews: Review[]) {
  return reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
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
            {reviews.length} review{reviews.length === 1 ? "" : "s"}
          </span>
        </span>
      )}
    </StatTile>
  );
}
