"use client";

import { MapPin } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ProfileReview } from "@/lib/api";
import { travelerTypeLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
import { BackLink, tones } from "@/components/PlaceDetail";
import { Reveal } from "@/components/Reveal";
import { Stars, formatDate, glassCard } from "@/components/ReviewsSection";
import { HelpfulCount } from "@/components/HelpfulButton";
import { Skeleton } from "@/components/ui/skeleton";
import { displayNameOf, useCurrentUser } from "@/lib/login";

const reviewsWord = (n: number) => `${n} review${n === 1 ? "" : "s"}`;

// A traveler's profile page (profiles & likes round, ticket 73): their name
// in large serif letters, their traveler type, how many reviews they have
// written, and every review, newest first, each linking to its place.
// Only what their reviews already show to everyone: never an email.
//
// `emptyMessage` is shown instead of the list when there are no reviews
// (used by "My profile", ticket 74).
export function TravelerProfileView({
  name,
  travelerType,
  reviews,
  emptyMessage,
}: {
  name: string;
  travelerType: string | null;
  reviews: ProfileReview[];
  emptyMessage?: string;
}) {
  const typeLabel = travelerType ? travelerTypeLabels[travelerType] : undefined;

  return (
    <main className={cn("min-h-screen text-white", tones.destination.page)}>
      <div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6">
        <BackLink />

        <header className="mt-10 motion-safe:animate-fade-up">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-white/65">
            Traveler profile
          </p>
          <h1 className="mt-2 font-fraunces text-5xl font-medium leading-[0.95] tracking-tight wrap-anywhere sm:text-6xl">
            {name}
          </h1>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-sm">
            {typeLabel && (
              <span className="rounded-full border border-white/25 bg-white/15 px-3 py-1 font-semibold">
                {typeLabel}
              </span>
            )}
            <span className="text-white/80">{reviewsWord(reviews.length)}</span>
          </div>
        </header>

        <section aria-labelledby="profile-reviews" className="mt-10">
          <h2 id="profile-reviews" className="mb-4 font-fraunces text-3xl font-medium">
            Reviews
          </h2>

          {reviews.length === 0 ? (
            <p className="text-white/85">{emptyMessage ?? "No reviews yet."}</p>
          ) : (
            <ul className="space-y-3">
              {reviews.map((review) => (
                <li key={review.id}>
                  <Reveal>
                    <Card className={glassCard}>
                      <CardContent className="space-y-2 p-5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          {review.place_name ? (
                            <Link
                              href={`/${review.place_type}s/${review.place_id}`}
                              className="flex min-w-0 items-center gap-1.5 rounded font-semibold underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                            >
                              <MapPin aria-hidden="true" className="size-4 shrink-0" />
                              <span className="wrap-anywhere">{review.place_name}</span>
                            </Link>
                          ) : (
                            <span className="font-semibold text-white/70">A place that was removed</span>
                          )}
                          <time dateTime={review.created_at} className="text-sm text-white/70">
                            {formatDate(review.created_at)}
                          </time>
                        </div>
                        <Stars rating={review.rating} />
                        <p className="whitespace-pre-line wrap-anywhere leading-relaxed text-white/90">
                          {review.comment}
                        </p>
                        <HelpfulCount count={review.helpful_count} />
                      </CardContent>
                    </Card>
                  </Reveal>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

// Shown for an unknown traveler, or one with no reviews.
export function TravelerNotFound() {
  return (
    <main className={cn("min-h-screen text-white", tones.destination.page)}>
      <div className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <h1 className="font-fraunces text-4xl font-medium">We couldn&apos;t find this traveler</h1>
        <p className="mt-2 text-white/80">
          They may not have written any reviews yet. Try another reviewer&apos;s name.
        </p>
        <div className="mt-6">
          <BackLink />
        </div>
      </div>
    </main>
  );
}

// Shown when the backend has no public profile for this id (unknown, or no
// reviews yet). If it is the logged-in
// traveler's own id, they still get their profile ("My profile", ticket
// 74): their name and traveler type from "who is logged in", and a note
// that they have no reviews yet. Anyone else sees "We couldn't find this
// traveler". For the moment while the login is being checked, a grey
// placeholder shaped like the profile shows (not a blank page, and not the
// "couldn't find" message, which would flash for a traveler opening their
// own empty profile).
export function TravelerNotFoundOrMine() {
  // The traveler id from the address (/travelers/<id>): the not-found
  // screen does not receive the page's params.
  const id = usePathname().split("/").pop() ?? "";
  const { user, ready } = useCurrentUser();
  if (!ready) {
    return (
      <main className={cn("min-h-screen text-white", tones.destination.page)}>
        <div className="mx-auto max-w-3xl px-4 pt-6 pb-16 sm:px-6">
          <BackLink />
          <p role="status" className="sr-only">
            Loading profile
          </p>
          <div className="mt-10 space-y-3">
            <Skeleton className="h-3 w-28" />
            <Skeleton className="h-12 w-2/3 max-w-sm" />
            <Skeleton className="h-6 w-40 rounded-full" />
          </div>
        </div>
      </main>
    );
  }
  if (user && user.id === id) {
    return (
      <TravelerProfileView
        name={displayNameOf(user)}
        travelerType={user.traveler_type}
        reviews={[]}
        emptyMessage="You haven't written any reviews yet."
      />
    );
  }
  return <TravelerNotFound />;
}
