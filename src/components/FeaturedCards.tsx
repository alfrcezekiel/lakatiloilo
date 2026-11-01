import Link from "next/link";
import { ViewDetails } from "@/components/ViewDetails";
import { CardRating, type RatingsByPlace } from "@/components/CardRating";
import { Reveal } from "@/components/Reveal";
import type { Destination } from "@/lib/api";
import { Skeleton } from "@/components/ui/skeleton";

interface FeaturedCardsProps {
  destinations: Destination[];
  // Every reviewed place's rating, for the line under each name.
  ratings: RatingsByPlace;
  // True while the home page is still waiting for the backend.
  loading: boolean;
}

// The card's outer box, shared by the real cards and their skeletons so
// both are exactly the same size and nothing jumps when the data arrives.
// No shadow and no backdrop blur: a blur on a card that fades in and lifts
// on hover was painted in pieces, which showed as light bands on the card
// (found by the team, 2026-11-01). The background behind is a smooth
// gradient, so the blur added almost nothing.
const cardClass =
  "flex min-w-0 items-center gap-4 sm:gap-5 rounded-3xl border border-white/25 bg-white/10 p-3 sm:p-4";
const photoClass =
  "aspect-3/2 w-24 shrink-0 min-[400px]:w-32 overflow-hidden rounded-2xl sm:w-48";

// The two hero cards. Both come from the real destinations the home page
// already loaded: Featured is Dinagyang Festival, Trending is Bucari Little
// Baguio (both have real photos), falling back to the first mountain if
// Bucari is missing. While the places are loading, both cards show as
// skeletons. Once loaded, a card is left out if its place is not in the
// data, so visitors never see a broken image or a made-up name.
export function FeaturedCards({ destinations, ratings, loading }: FeaturedCardsProps) {
  if (loading) {
    return (
      <div className="grid gap-5 lg:grid-cols-2">
        {[0, 1].map((i) => (
          <div key={i} className={cardClass}>
            <Skeleton className={photoClass} />
            <div className="min-w-0 flex-1">
              <Skeleton className="h-6 w-24 rounded-full" />
              <Skeleton className="mt-3 h-7 w-3/4 sm:h-9" />
              {/* The rating line. */}
              <Skeleton className="mt-1 h-5 w-28" />
              {/* The amber "View details" button (44 px tall). */}
              <Skeleton className="mt-3 h-11 w-40 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  const featured = destinations.find((d) => d.name === "Dinagyang Festival");
  const trending =
    destinations.find((d) => d.name === "Bucari Little Baguio") ??
    destinations.find((d) => d.category === "mountain");

  const cards = [
    featured && {
      place: featured,
      badge: "Featured",
      badgeClass: "bg-yellow-300 text-yellow-950",
    },
    trending && {
      place: trending,
      badge: "Trending",
      badgeClass: "bg-white/90 text-teal-900",
    },
  ].filter((card) => !!card);

  if (cards.length === 0) return null;

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      {cards.map(({ place, badge, badgeClass }, index) => (
        <Reveal key={badge} className="grid" delay={index * 0.12}>
          <Link
            href={`/destinations/${place.id}`}
            className={`group ${cardClass} transition duration-300 motion-safe:hover:-translate-y-1 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-white`}
          >
            <div className={photoClass}>
              <img
                src={place.photo_url}
                alt={place.name}
                className="h-full w-full object-cover transition-transform duration-300 motion-safe:group-hover:scale-105"
              />
            </div>
            <div className="min-w-0">
              <span
                className={`inline-block rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-widest ${badgeClass}`}
              >
                {badge}
              </span>
              <h3 className="font-fraunces mt-2 line-clamp-2 text-xl font-medium text-white sm:text-3xl">
                {place.name}
              </h3>
              <div className="mt-1">
                <CardRating ratings={ratings} placeType="destination" placeId={place.id} />
              </div>
              <ViewDetails className="mt-3" />
            </div>
          </Link>
        </Reveal>
      ))}
    </div>
  );
}
