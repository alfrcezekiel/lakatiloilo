"use client";

import { pillButton } from "@/components/ui/button";
import { REVIEW_SORTS, type ReviewSort } from "@/lib/review-order";
import { cn } from "@/lib/utils";

// The controls around a place's reviews (tickets 162 and 163): the three
// sort chips and Show more reviews. Moved out of ReviewsSection.tsx in the
// code review of 2026-11-23, so that file keeps to the reviews themselves.

// Most relevant · With photos & videos · Newest. On a phone the three chips
// are equal columns (a long label wraps under itself) instead of wrapping
// into uneven rows.
export function ReviewSortChips({ active, onChoose }: { active: ReviewSort; onChoose: (sort: ReviewSort) => void }) {
  return (
    <div role="group" aria-label="Sort reviews" className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
      {REVIEW_SORTS.map((option) => (
        <button
          key={option.id}
          type="button"
          aria-pressed={active === option.id}
          onClick={() => onChoose(option.id)}
          className={cn(
            "min-h-11 cursor-pointer rounded-full px-3 py-2 text-center text-sm leading-tight font-semibold transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4.5",
            active === option.id
              ? "bg-white text-teal-950"
              : "border border-white/25 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

// 3 reviews first, then 5 more each press, so the page never turns into an
// endless scroll. Nothing shows once every review is shown.
export function ShowMoreReviews({ shown, total, onMore }: { shown: number; total: number; onMore: () => void }) {
  if (total <= shown) return null;
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
      <button type="button" onClick={onMore} aria-describedby="reviews-shown-count" className={pillButton({ kind: "glass" })}>
        Show more reviews
      </button>
      <p id="reviews-shown-count" className="text-sm text-white/80">
        Showing {shown} of {total}
      </p>
    </div>
  );
}
