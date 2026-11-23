import type { Review } from "@/lib/api";

// How a place's reviews are ordered and how many show at once (tickets 162
// and 163, reviews & media round). Kept apart from ReviewsSection so the
// rules can be unit-tested (review-order.test.ts).

// The three chips over the reviews, in the order they appear.
export type ReviewSort = "relevant" | "media" | "newest";

export const REVIEW_SORTS: { id: ReviewSort; label: string }[] = [
  { id: "relevant", label: "Most relevant" },
  { id: "media", label: "With photos & videos" },
  { id: "newest", label: "Newest" },
];

// The chip chosen when the page opens.
export const FIRST_SORT: ReviewSort = "relevant";

// Show more reviews: how many show first, and how many each press adds.
export const FIRST_SHOWN = 3;
export const MORE_STEP = 5;

// "Most relevant", the same rule as the admin Reviews screen (ticket 130):
// Helpful marks plus replies. A deleted reply does not count, whether its
// writer deleted it or the team moved it to the Trash ("This reply was
// deleted", kept only so the answers under it stay); the admin sort leaves
// out both the same way (code review 2026-11-23).
export function relevance(review: Review) {
  const replies = (review.replies ?? []).filter((reply) => !reply.deleted).length;
  return (review.helpful_count ?? 0) + replies;
}

// Does the review have something to look at: a photo or a video (ticket
// 165)?
export function hasMedia(review: Review) {
  return (review.photos?.length ?? 0) > 0 || Boolean(review.video_url);
}

// Newest first; two reviews from the same moment keep a fixed order (by
// id), so the list never jumps between renders.
function newestFirst(a: Review, b: Review) {
  const byDate = b.created_at.localeCompare(a.created_at);
  return byDate !== 0 ? byDate : a.id.localeCompare(b.id);
}

// The reviews for a chip: a new list, the one passed in is left as it is.
// viewerId: the logged-in traveler. Their own review comes first, so it is
// never hidden behind Show more reviews (team decision 2026-11-23). Under
// With photos & videos it still needs a photo or video to be listed.
export function orderReviews(reviews: Review[], sort: ReviewSort, viewerId?: string): Review[] {
  const ordered =
    sort === "media"
      ? reviews.filter(hasMedia).sort(newestFirst)
      : sort === "newest"
        ? [...reviews].sort(newestFirst)
        : [...reviews].sort((a, b) => relevance(b) - relevance(a) || newestFirst(a, b));
  if (!viewerId) return ordered;
  return [
    ...ordered.filter((review) => review.user_id === viewerId),
    ...ordered.filter((review) => review.user_id !== viewerId),
  ];
}

// How many to show after one more press of Show more reviews.
export function showMore(shown: number, total: number) {
  return Math.min(total, shown + MORE_STEP);
}
