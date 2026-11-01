import { Star } from "lucide-react";
import type { PlaceRating } from "@/lib/api";

// Every reviewed place's rating, looked up by "destination:<id>" or
// "accommodation:<id>". null when the ratings could not be loaded.
export type RatingsByPlace = Map<string, PlaceRating> | null;

export const ratingKey = (placeType: PlaceRating["place_type"], placeId: string) =>
  `${placeType}:${placeId}`;

// The rating line under a home page card's name (buttons & cards round):
// "★ 4.3 · 12 reviews", or "No reviews yet". The number is rounded the
// same way as the Rating tile on the detail page, so the two always agree.
// If the ratings could not be loaded, it shows nothing rather than a wrong
// "No reviews yet".
export function CardRating({
  ratings,
  placeType,
  placeId,
}: {
  ratings: RatingsByPlace;
  placeType: PlaceRating["place_type"];
  placeId: string;
}) {
  if (!ratings) return null;
  const rating = ratings.get(ratingKey(placeType, placeId));

  if (!rating) {
    return <p className="text-sm text-white/70">No reviews yet</p>;
  }

  const average = rating.average_rating.toFixed(1);
  const count = `${rating.review_count} review${rating.review_count === 1 ? "" : "s"}`;
  return (
    <p className="text-sm text-white">
      {/* Screen readers hear the sentence; everyone else sees the short form. */}
      <span className="sr-only">
        Rated {average} out of 5 from {count}
      </span>
      <span aria-hidden="true" className="flex items-center gap-1.5">
        <Star className="size-4 shrink-0 fill-amber-300 text-amber-300" />
        <span className="font-semibold">{average}</span>
        <span className="text-white/70">· {count}</span>
      </span>
    </p>
  );
}
