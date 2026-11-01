"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import { getReviews, type Review } from "@/lib/api";
import { StatTile } from "@/components/PlaceDetail";

type PlaceType = "destination" | "accommodation";

interface PlaceReviewsValue {
  placeType: PlaceType;
  placeId: string;
  // null while loading.
  reviews: Review[] | null;
  loadError: boolean;
  setReviews: Dispatch<SetStateAction<Review[] | null>>;
}

// A "context" is React's way of sharing data with every component inside a
// wrapper without passing it down by hand. The detail page loads the
// reviews once here, and both the Rating tile at the top and the Reviews
// section further down read the same list. So when a traveler posts,
// edits or deletes a review, both update together.
const PlaceReviewsContext = createContext<PlaceReviewsValue | null>(null);

export function PlaceReviewsProvider({
  placeType,
  placeId,
  children,
}: {
  placeType: PlaceType;
  placeId: string;
  children: ReactNode;
}) {
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loadError, setLoadError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        // From the NestJS backend (GET /v1/reviews), newest first.
        const data = await getReviews(placeType, placeId);
        if (!cancelled) setReviews(data);
      } catch {
        if (!cancelled) setLoadError(true);
      }
    }
    load();
    // If the traveler leaves the page before the answer arrives, ignore it.
    return () => {
      cancelled = true;
    };
  }, [placeType, placeId]);

  return (
    <PlaceReviewsContext.Provider
      value={{ placeType, placeId, reviews, loadError, setReviews }}
    >
      {children}
    </PlaceReviewsContext.Provider>
  );
}

export function usePlaceReviews() {
  const value = useContext(PlaceReviewsContext);
  if (!value) {
    throw new Error("usePlaceReviews must be used inside <PlaceReviewsProvider>.");
  }
  return value;
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
