"use client";

import { Check, EyeOff, LogIn } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
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
import { ReviewPhotos } from "@/components/ReviewPhoto";
import { ReviewVideo } from "@/components/ReviewVideo";
import { FromNotification, notifiedTint } from "@/components/FromNotification";
import { SectionHeading } from "@/components/PlaceDetail";
import { averageRating, RatingSummary, usePlaceReviews } from "@/components/PlaceReviews";
import { travelerTypeLabels } from "@/lib/labels";
import {
  FIRST_SHOWN,
  FIRST_SORT,
  hasMedia,
  orderReviews,
  REVIEW_SORTS,
  showMore,
  type ReviewSort,
} from "@/lib/review-order";

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
// eyebrow: the numbered label over the heading on the glass detail pages
// ("05 — Guests say").
export function ReviewsSection({ eyebrow }: { eyebrow?: string } = {}) {
  const pathname = usePathname();
  const { user, ready } = useCurrentUser();
  const { placeType, placeId, reviews, loadError, setReviews } = usePlaceReviews();
  // True right after this traveler posts, to say thank you.
  const [justPosted, setJustPosted] = useState(false);
  // True while the form is posting a new review and uploading its photos
  // (ticket 113). A live refresh can bring the new review in before the
  // photos are done; the form stays until then, so its progress and any
  // photo message stay on screen.
  const [posting, setPosting] = useState(false);
  // The backend's message right after this traveler deletes their review,
  // for example "Your review has been deleted."
  const [deletedMessage, setDeletedMessage] = useState<string | null>(null);

  const average = reviews ? averageRating(reviews) : null;

  // Sorting and Show more reviews (tickets 162 and 163): the chosen chip and
  // how many reviews show. The order rules live in src/lib/review-order.ts.
  const [sort, setSort] = useState<ReviewSort>(FIRST_SORT);
  const [shown, setShown] = useState(FIRST_SHOWN);
  // After Show more, the first newly shown review takes the keyboard
  // focus, so a screen-reader user hears what was added.
  const focusFrom = useRef<number | null>(null);

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

  // The review a notification points at (the review itself, or the one a
  // reply is under). It must be on screen: if "With photos & videos" would
  // hide it, Newest is used instead, and the list opens far enough to
  // include it.
  const targetReview = useMemo(() => {
    if (!reviews || !focus) return undefined;
    const id = focus.slice(focus.indexOf("-") + 1);
    return focus.startsWith("review-")
      ? reviews.find((r) => r.id === id)
      : reviews.find((r) => r.replies?.some((reply) => reply.id === id));
  }, [reviews, focus]);
  const activeSort: ReviewSort = sort === "media" && targetReview && !hasMedia(targetReview) ? "newest" : sort;
  const ordered = useMemo(() => orderReviews(reviews ?? [], activeSort), [reviews, activeSort]);
  const targetIndex = targetReview ? ordered.findIndex((r) => r.id === targetReview.id) : -1;
  const visibleCount = Math.max(shown, targetIndex + 1);
  const visible = ordered.slice(0, visibleCount);

  const chooseSort = (next: ReviewSort) => {
    setSort(next);
    setShown(FIRST_SHOWN);
  };
  const pressShowMore = () => {
    focusFrom.current = visibleCount;
    setShown(showMore(visibleCount, ordered.length));
  };
  useEffect(() => {
    const index = focusFrom.current;
    if (index === null) return;
    focusFrom.current = null;
    const review = ordered[index];
    if (review) document.getElementById(`review-${review.id}`)?.focus({ preventScroll: true });
  }, [visibleCount, ordered]);
  useEffect(() => {
    if (!reviews || !focus || scrolledTo.current === focus) return;
    if (!document.getElementById(focus)) return;
    scrolledTo.current = focus;
    scrollToItem(focus);
  }, [reviews, focus, visibleCount, activeSort]);
  // A notification clicked while this page is open, even one whose address
  // is already the current one: scroll to it again.
  useEffect(() => {
    const onFocus = (event: Event) => scrollToItem((event as CustomEvent<string>).detail);
    window.addEventListener(FOCUS_EVENT, onFocus);
    return () => window.removeEventListener(FOCUS_EVENT, onFocus);
  }, []);


  return (
    <section aria-labelledby="reviews-heading">
      <SectionHeading id="reviews-heading" eyebrow={eyebrow}>
        Reviews
      </SectionHeading>

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
          {/* The big average with a bar per star (glass detail pages round). */}
          {average === null ? (
            <p className="text-white/90">No reviews yet.</p>
          ) : (
            <RatingSummary reviews={reviews} />
          )}

          {/* Logged in: the form, or a note if they already reviewed. */}
          {ready && user && (
            myReview && !posting ? (
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
                  onPostingChange={setPosting}
                  onSaved={(review) => {
                    // Newest first, so the new review goes on top. A live
                    // refresh may already have brought it in while its
                    // photos were uploading (ticket 113): then replace that
                    // copy, so it is never listed twice.
                    setReviews((current) => [review, ...current.filter((r) => r.id !== review.id)]);
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
            // On a phone the three chips are equal columns (a long label
            // wraps under itself) instead of wrapping into uneven rows.
            <div role="group" aria-label="Sort reviews" className="grid grid-cols-3 gap-2 sm:flex sm:flex-wrap">
              {REVIEW_SORTS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  aria-pressed={activeSort === option.id}
                  onClick={() => chooseSort(option.id)}
                  className={cn(
                    "min-h-11 cursor-pointer rounded-full px-3 py-2 text-center text-sm leading-tight font-semibold transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4.5",
                    activeSort === option.id
                      ? "bg-white text-teal-950"
                      : "border border-white/25 bg-white/10 text-white/80 hover:bg-white/20 hover:text-white",
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          )}

          {reviews.length > 0 && ordered.length === 0 && (
            <p className="text-white/90">No reviews with photos or videos yet.</p>
          )}

          {visible.length > 0 && (
            <ul className="flex flex-col">
              {/* A new review slides in at the top; a deleted one shrinks
                  away and the others glide into its place. initial={false}:
                  the reviews already there when the page opens don't move.
                  The gap between cards is padding inside each item, so it
                  shrinks away together with a deleted review. */}
              <AnimatePresence initial={false}>
                {visible.map((review) => (
                  <motion.li
                    key={review.id}
                    id={`review-${review.id}`}
                    // Takes the focus after Show more reviews (outline for
                    // the keyboard only).
                    tabIndex={-1}
                    layout
                    initial={{ opacity: 0, y: -16, height: 0 }}
                    animate={{ opacity: 1, y: 0, height: "auto" }}
                    exit={{ opacity: 0, scale: 0.96, height: 0 }}
                    className="scroll-mt-28 overflow-hidden rounded-xl pb-3 focus:outline-none focus-visible:outline-2 focus-visible:outline-white"
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
                        {/* Only the writer ever gets their hidden review
                            (ticket 109); a grey note says why nobody else
                            sees it. */}
                        {review.hidden && (
                          <p className="flex items-center gap-2 rounded-lg border border-white/25 px-3 py-2 text-sm text-white/85">
                            <EyeOff aria-hidden="true" className="size-4 shrink-0" />
                            Hidden while the team reviews it.
                          </p>
                        )}
                        <Stars rating={review.rating} />
                        {/* wrap-anywhere: a word longer than the card (for
                            example a long link, or letters typed without
                            spaces) breaks onto the next line instead of
                            running off the side. */}
                        <p className="whitespace-pre-line wrap-anywhere text-white/90 leading-relaxed">
                          {review.comment}
                        </p>
                        <ReviewPhotos photos={review.photos} reviewerName={review.reviewer_name} />
                        <ReviewVideo url={review.video_url} reviewerName={review.reviewer_name} />
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

          {/* Show more reviews (ticket 163): 3 first, then 5 more each
              press, so the page never turns into an endless scroll. */}
          {ordered.length > visibleCount && (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
              <button
                type="button"
                onClick={pressShowMore}
                aria-describedby="reviews-shown-count"
                className={pillButton({ kind: "glass" })}
              >
                Show more reviews
              </button>
              <p id="reviews-shown-count" className="text-sm text-white/80">
                Showing {visibleCount} of {ordered.length}
              </p>
            </div>
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
