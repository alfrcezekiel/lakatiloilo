"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { createClient } from "@/lib/supabase/client";
import { useCurrentUser } from "@/lib/auth";
import { ReviewForm } from "@/components/ReviewForm";
import { MyReviewBox } from "@/components/MyReviewBox";

export type Review = {
  id: string;
  user_id: string;
  reviewer_name: string;
  rating: number;
  comment: string;
  created_at: string;
};

interface ReviewsSectionProps {
  placeType: "destination" | "accommodation";
  placeId: string;
}

const glassCard = "bg-white/15 backdrop-blur-md border border-white/25 text-white";

// The Reviews part of a destination or accommodation page. It reads the
// reviews straight from Supabase in the browser: Row Level Security lets
// anyone read them, so no login is needed to see them. Only the reviewer's
// display name is shown, never their email.
export function ReviewsSection({ placeType, placeId }: ReviewsSectionProps) {
  const pathname = usePathname();
  const { user, ready } = useCurrentUser();
  // null while loading.
  const [reviews, setReviews] = useState<Review[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  // True right after this traveler posts, to say thank you.
  const [justPosted, setJustPosted] = useState(false);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const { data, error } = await createClient()
          .from("reviews")
          .select("id, user_id, reviewer_name, rating, comment, created_at")
          .eq("place_type", placeType)
          .eq("place_id", placeId)
          .order("created_at", { ascending: false });
        if (cancelled) return;
        if (error) throw error;
        setReviews(data ?? []);
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

  // Worked out here from the reviews themselves, so the database needs no
  // extra columns to keep in step.
  const average =
    reviews && reviews.length > 0
      ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
      : null;

  // This traveler's own review of this place, if they wrote one.
  const myReview = user ? reviews?.find((r) => r.user_id === user.id) : undefined;


  return (
    <section aria-labelledby="reviews-heading">
      <h2 id="reviews-heading" className="text-2xl font-semibold text-white mb-4">
        Reviews
      </h2>

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
                    (current ?? []).map((r) => (r.id === saved.id ? saved : r)),
                  );
                  setJustPosted(false);
                }}
                onDeleted={(reviewId) => {
                  setReviews((current) => (current ?? []).filter((r) => r.id !== reviewId));
                  setJustPosted(false);
                }}
              />
            ) : (
              <ReviewForm
                placeType={placeType}
                placeId={placeId}
                onSaved={(review) => {
                  // Newest first, so the new review goes on top.
                  setReviews((current) => [review, ...(current ?? [])]);
                  setJustPosted(true);
                }}
              />
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
            <ul className="space-y-3">
              {reviews.map((review) => (
                <li key={review.id}>
                  <Card className={glassCard}>
                    <CardContent className="p-5 space-y-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="flex items-center gap-2 font-semibold">
                          {review.reviewer_name}
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
                </li>
              ))}
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
