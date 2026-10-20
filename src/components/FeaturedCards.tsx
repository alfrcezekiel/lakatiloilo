import Link from "next/link";
import type { Destination } from "@/lib/api";

interface FeaturedCardsProps {
  destinations: Destination[];
}

// The two hero cards. Both come from the real destinations the home page
// already loaded: Featured is Dinagyang Festival, Trending is Bucari Little
// Baguio (both have real photos), falling back to the first mountain if
// Bucari is missing. A card is left out if its place is not in the data (or has not
// loaded yet), so visitors never see a broken image or a made-up name.
export function FeaturedCards({ destinations }: FeaturedCardsProps) {
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
      {cards.map(({ place, badge, badgeClass }) => (
        <Link
          key={badge}
          href={`/destinations/${place.id}`}
          className="group flex min-w-0 items-center gap-4 sm:gap-5 rounded-3xl border border-white/25 bg-white/10 p-3 shadow-2xl backdrop-blur-md transition-colors hover:bg-white/20 sm:p-4"
        >
          <div className="aspect-3/2 w-24 shrink-0 min-[400px]:w-32 overflow-hidden rounded-2xl sm:w-48">
            <img
              src={place.photo_url}
              alt={place.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
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
            <p className="mt-1 text-sm text-white/80">
              View details{" "}
              <span
                aria-hidden="true"
                className="inline-block transition-transform group-hover:translate-x-1"
              >
                →
              </span>
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
