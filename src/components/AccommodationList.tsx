import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { PlaceListSkeleton } from "@/components/PlaceListSkeleton";
import { Reveal } from "@/components/Reveal";
import { ViewDetails, cardLink } from "@/components/ViewDetails";
import { CardRating, type RatingsByPlace } from "@/components/CardRating";
import { PlacePhoto } from "@/components/PlacePhoto";

interface Accommodation {
  id: string;
  name: string;
  description: string;
  address: string;
  photo_url: string | null;
  type: string;
}

interface AccommodationListProps {
  accommodations: Accommodation[];
  id?: string;
  // Every reviewed place's rating, for the line under each name.
  ratings: RatingsByPlace;
  // True while the home page is still waiting for the backend.
  loading: boolean;
  // The heading: "Hotels & Condominiums", or "Places to stay" once the
  // team has added another kind (ticket 117).
  title?: string;
}

export function AccommodationList({
  accommodations,
  id,
  ratings,
  loading,
  title = "Hotels & Condominiums",
}: AccommodationListProps) {
  if (loading) {
    return (
      <PlaceListSkeleton id={id} title={title} withPill />
    );
  }

  // Same as the destination lists: hide the section when the filter leaves
  // nothing to show. The id goes with it, so the Hotels and Condominiums
  // cards have nothing to scroll to when they show 0 places.
  if (accommodations.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-20 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2 className="mb-8 text-3xl font-semibold text-white">
            {title}
          </h2>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {accommodations.map((accommodation, index) => (
            // Cards in one row arrive one after another (3 per row on a
            // laptop). "grid" lets the card fill the whole row height.
            <Reveal key={accommodation.id} className="grid" delay={(index % 3) * 0.1}>
              <Link
                href={`/accommodations/${accommodation.id}`}
                className={cardLink}
              >
                <Card className="overflow-hidden bg-white/15 border border-white/25 shadow-none transition duration-300 motion-safe:hover:-translate-y-1 cursor-pointer h-full flex flex-col">
                  {/* Fixed aspect ratio for card alignment; original photo
                      at full resolution (team request 2026-11-19). */}
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <PlacePhoto
                      src={accommodation.photo_url}
                      alt={accommodation.name}
                      fullSize={true}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-1 text-lg text-white">
                      {accommodation.name}
                    </CardTitle>
                    <CardRating ratings={ratings} placeType="accommodation" placeId={accommodation.id} />
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <p className="line-clamp-2 text-sm text-white/90">
                      {accommodation.description}
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-white/70">Address</p>
                      <p className="text-xs text-white/90">{accommodation.address}</p>
                    </div>
                    <div className="self-start rounded-full bg-white/20 px-3 py-1 text-xs font-medium text-white capitalize">
                      {accommodation.type}
                    </div>
                    <ViewDetails />
                  </CardContent>
                </Card>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
