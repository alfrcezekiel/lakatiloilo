"use client";

import { Check, LogIn } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { pillButton } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import type { Review } from "@/lib/api";
import { useCurrentUser } from "@/lib/login";
import { FOCUS_EVENT, useFocusTarget } from "@/lib/focus-target";
import { cn } from "@/lib/utils";
import { ReviewForm } from "@/components/ReviewForm";
import { MyReviewBox } from "@/components/MyReviewBox";
import { HelpfulButton } from "@/components/HelpfulButton";
import { ReviewReplies } from "@/components/ReviewReplies";
import { ReportReview } from "@/components/ReportReview";
import { ReviewPhoto } from "@/components/ReviewPhoto";
import { FromNotification, notifiedTint } from "@/components/FromNotification";
import { SectionHeading } from "@/components/PlaceDetail";
import { averageRating, usePlaceReviews } from "@/components/PlaceReviews";
import { travelerTypeLabels } from "@/lib/labels";

// Scrolls a review or reply into view (below the navbar, scroll-mt-28),
// one frame later so a thread that just opened has its full height.
function scrollToItem(id: string) {
  requestAnimationFrame(() =>
    document.getElementById(id)?.scrollIntoView({ block: "start" }),
  );
}

// The review type lives with the backend calls; other components import it
// from here.
export type { Review };

// The see-through card every review sits in (also used on profile pages).
// No backdrop blur and no shadow: on cards that fade in, a blur is painted
// in pieces and shows as light bands (see ticket 68).
export const glassCard = "rounded-xl bg-white/10 border border-white/20 text-white shadow-none";

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

  // Opened from a notification (ticket 103): "?focus=" names a review or a
  // reply ("review-<id>" / "reply-<id>", the ids on their list items). The
  // reviews arrive after the page opens, so the browser cannot jump there
  // by itself; once that item is on screen (ReviewReplies unfolds the
  // thread around a reply), scroll to it, once per notification. It glows
  // amber for a moment (animate-highlight).
  const focus = useFocusTarget();
  const scrolledTo = useRef<string | null>(null);
  useEffect(() => {
    if (!reviews || !focus || scrolledTo.current === focus) return;
    if (!document.getElementById(focus)) return;
    scrolledTo.current = focus;
    scrollToItem(focus);
  }, [reviews, focus]);
  // A notification clicked while this page is open, even one whose address
  // is already the current one: scroll to it again.
  useEffect(() => {
    const onFocus = (event: Event) => scrollToItem((event as CustomEvent<string>).detail);
    window.addEventListener(FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_EVENT, onFocus);
  }, []);


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
                  // Merge, don't replace: the edit's answer has no replies
                  // or Helpful count, so keep the ones already on screen.
                  setReviews((current) =>
                    current.map((r) => (r.id === saved.id ? { ...r, ...saved } : r)),
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
                    className="flex items-start gap-2 rounded-xl border border-white/25 bg-white/15 px-4 py-3 font-semibold text-white"
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
            <Link
              href={`/login?next=${encodeURIComponent(pathname)}`}
              className={pillButton({ kind: "main" })}
            >
              <LogIn aria-hidden="true" />
              Log in to write a review
            </Link>
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
                    id={`review-${review.id}`}
                    layout
                    initial={{ opacity: 0, y: -16, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, scale: 0.96, height: 0 }}
                    className="scroll-mt-28 overflow-hidden pb-3"
                  >
                    {/* The review a notification opened (a Helpful mark
                        on it): amber border, soft amber background and a
                        "From your notification" label (ticket 103). */}
                    <Card
                      className={cn(
                        glassCard,
                        focus === `review-${review.id}` && "border-amber-300/70",
                        focus === `review-${review.id}` && notifiedTint,
                      )}
                    >
                      <CardContent className="p-5 space-y-2">
                        {focus === `review-${review.id}` && <FromNotification />}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {/* min-w-0 and flex-wrap let a long name and its
                              tags wrap onto a second line on narrow phones. */}
                          <span className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1 font-semibold">
                            {/* Opens the reviewer's profile (ticket 73). */}
                            <Link
                              href={`/travelers/${review.user_id}`}
                              className="rounded wrap-anywhere underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                              {review.reviewer_name}
                            </Link>
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
                        {/* wrap-anywhere: a word longer than the card (for
                            example a long link, or letters typed without
                            spaces) breaks onto the next line instead of
                            running off the side. */}
                        <p className="whitespace-pre-line wrap-anywhere text-white/90 leading-relaxed">
                          {review.comment}
                        </p>
                        {review.photo_url && (
                          <ReviewPhoto url={review.photo_url} reviewerName={review.reviewer_name} />
                        )}
                        {/* Helpful on the left, the small Report link
                            (ticket 80) on the right of the same row. */}
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <HelpfulButton
                            item={review}
                            user={user}
                            onChange={(count, liked) =>
                              setReviews(
                                (current) =>
                                  current.map((r) =>
                                    r.id === review.id
                                      ? { ...r, helpful_count: count, liked_by_me: liked }
                                      : r,
                                  ),
                                { refreshPages: false },
                              )
                            }
                          />
                          <ReportReview reviewId={review.id} reviewerId={review.user_id} user={user} />
                        </div>
                        <ReviewReplies
                          reviewId={review.id}
                          replies={review.replies ?? []}
                          user={user}
                          onChange={(replies) =>
                            setReviews(
                              (current) =>
                                current.map((r) => (r.id === review.id ? { ...r, replies } : r)),
                              { refreshPages: false },
                            )
                          }
                        />
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

export function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-PH", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}
