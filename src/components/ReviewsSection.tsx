"use client";

import { Check } from "lucide-react";
import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Review } from "@/lib/api";
import { useCurrentUser } from "@/lib/login";
import { ReviewForm } from "@/components/ReviewForm";
import { MyReviewBox } from "@/components/MyReviewBox";
import { SectionHeading } from "@/components/PlaceDetail";
import { averageRating, usePlaceReviews } from "@/components/PlaceReviews";
import { travelerTypeLabels } from "@/lib/labels";

// The review type lives with the backend calls; other components import it
// from here.
export type { Review };

const glassCard = "rounded-xl bg-white/10 backdrop-blur-md border border-white/20 text-white";

// The Reviews part of a destination or accommodation page. The reviews
// come from <PlaceReviewsProvider> (src/components/PlaceReviews.tsx), which
// reads them from the NestJS backend once for the whole page: Row Level
// Security lets anyone read them, so no login is needed to see them. Only
// the reviewer's display name is shown, never their email. Writing,
// editing and deleting go through the backend too.
export function ReviewsSection() {
  const pathname = usePathname();
  const { user, ready } = useCurrentUser();
  const { placeType, placeId, reviews, loadError, setReviews } = usePlaceReviews();
  // True right after this traveler posts, to say thank you.
  const [justPosted, setJustPosted] = useState(false);
  // The backend's message right after this traveler deletes their review,
  // for example "Your review has been deleted."
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);

  const average = reviews ? averageRating(reviews) : null;

  // This traveler's own review of this place, if they wrote one.
  const myReview = user ? reviews?.find((r) => r.user_id === user.id) : undefined;


  return (
    <section aria-labelledby="reviews-heading">
      <SectionHeading id="reviews-heading">Reviews</SectionHeading>

      {loadError ? (
        <p className="text-white/80">We couldn&apos;t load reviews right now.</p>
      ) : reviews === null ? (
        <div className="space-y-3">
          <p role="status" className="sr-only">
            Loading reviews
          </p>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-24 w-full rounded-xl" />
        </div>
      ) : (
        <div className="space-y-4">
          {/* Summary: average stars and how many reviews */}
          {average === null ? (
            <p className="text-white/90">No reviews yet.</p>
          ) : (
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-white">
              <Stars rating={average} className="text-xl" />
              <span className="text-lg font-semibold">{average.toFixed(1)}</span>
              <span className="text-white/70">
                · {reviews.length} review{reviews.length === 1 ? "" : "s"}
              </span>
            </p>
          )}

          {/* Logged in: the form, or a note if they already reviewed. */}
          {ready && user && (
            myReview ? (
              // One review per place: their review's box with Edit and
              // Delete, instead of the form.
              <MyReviewBox
                review={myReview}
                placeType={placeType}
                placeId={placeId}
                justPosted={justPosted}
                onSaved={(saved) => {
                  setReviews((current) =>
                    current.map((r) => (r.id === saved.id ? saved : r)),
                  );
                  setJustPosted(false);
                }}
                onDeleted={(reviewId, message) => {
                  setReviews((current) => current.filter((r) => r.id !== reviewId));
                  setJustPosted(false);
                  setDeletedMessage(message);
                }}
              />
            ) : (
              <div className="space-y-3">
                {deletedMessage && (
                  <p
                    role="status"
                    className="flex items-start gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-3 font-semibold text-white backdrop-blur-md"
                  >
                    <Check aria-hidden="true" className="mt-0.5 size-5 shrink-0" />
                    <span>{deletedMessage} You can write a new one below.</span>
                  </p>
                )}
                <ReviewForm
                  placeType={placeType}
                  placeId={placeId}
                  onSaved={(review) => {
                    // Newest first, so the new review goes on top.
                    setReviews((current) => [review, ...current]);
                    setJustPosted(true);
                    setDeletedMessage(null);
                  }}
                />
              </div>
            )
          )}

          {/* Logged out: invite them to log in and come back here. */}
          {ready && !user && (
            <p className="text-white/90">
              <Link
                href={`/login?next=${encodeURIComponent(pathname)}`}
                className="font-semibold text-white underline underline-offset-2 hover:text-white/80"
              >
                Log in to write a review
              </Link>
            </p>
          )}

          {reviews.length > 0 && (
            <ul className="flex flex-col">
              {/* A new review slides in at the top; a deleted one shrinks
                  away and the others glide into its place. initial={false}:
                  the reviews already there when the page opens don't move.
                  The gap between cards is padding inside each item, so it
                  shrinks away together with a deleted review. */}
              <AnimatePresence initial={false}>
                {reviews.map((review) => (
                  <motion.li
                    key={review.id}
                    layout
                    initial={{ opacity: 0, y: -16, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, scale: 0.96, height: 0 }}
                    className="overflow-hidden pb-3"
                  >
                    <Card className={glassCard}>
                      <CardContent className="p-5 space-y-2">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <span className="flex items-center gap-2 font-semibold">
                            {review.reviewer_name}
                            {review.traveler_type && travelerTypeLabels[review.traveler_type] && (
                              <span className="font-normal text-white/75">
                                · {travelerTypeLabels[review.traveler_type]}
                              </span>
                            )}
                            {user && review.user_id === user.id && (
                              <span className="rounded-full bg-white/20 px-2 py-0.5 text-xs font-medium">
                                You
                              </span>
                            )}
                          </span>
                          <time dateTime={review.created_at} className="text-sm text-white/70">
                            {formatDate(review.created_at)}
                          </time>
                        </div>
                        <Stars rating={review.rating} />
                        <p className="whitespace-pre-line text-white/90 leading-relaxed">
                          {review.comment}
                        </p>
                      </CardContent>
                    </Card>
                  </motion.li>
                ))}
              </AnimatePresence>
            </ul>
          )}
        </div>
      )}
    </section>
  );
}

// Five stars, filled up to the rating (rounded to the nearest whole star).
// Screen readers hear "4.3 out of 5 stars" instead of five symbols.
export function Stars({ rating, className = "" }: { rating: number; className?: string }) {
  const filled = Math.round(rating);
  const label = `${Number.isInteger(rating) ? rating : rating.toFixed(1)} out of 5 stars`;
  return (
    <span role="img" aria-label={label} className={`tracking-wide ${className}`}>
      <span aria-hidden="true" className="text-amber-300">
        {"★".repeat(filled)}
      </span>
      <span aria-hidden="true" className="text-white/30">
        {"★".repeat(5 - filled)}
      </span>
    </span>
  );
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
