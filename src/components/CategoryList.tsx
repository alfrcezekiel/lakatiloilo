import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import { PlaceListSkeleton } from "@/components/PlaceListSkeleton";
import { Reveal } from "@/components/Reveal";
import { ViewDetails, cardLink } from "@/components/ViewDetails";
import { CardRating, type RatingsByPlace } from "@/components/CardRating";
import { PlacePhoto } from "@/components/PlacePhoto";

interface Destination {
  id: string;
  name: string;
  description: string;
  address: string;
  photo_url: string | null;
  category: string;
}

interface CategoryListProps {
  destinations: Destination[];
  category: string;
  title: string;
  id?: string;
  // Every reviewed place's rating, for the line under each name.
  ratings: RatingsByPlace;
  // True while the home page is still waiting for the backend.
  loading: boolean;
}

export function CategoryList({ destinations, category, title, id, ratings, loading }: CategoryListProps) {
  const filteredDestinations = destinations
    .filter((dest) => dest.category === category)
    .slice(0, 6);

  // While loading, show the title and skeleton cards. After loading, a
  // section with no places is hidden, as before.
  if (loading) return <PlaceListSkeleton id={id} title={title} />;

  if (filteredDestinations.length === 0) return null;

  return (
    <section id={id} className="scroll-mt-20 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <Reveal>
          <h2 className="mb-8 text-3xl font-semibold text-white">
            {title}
          </h2>
        </Reveal>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredDestinations.map((destination, index) => (
            // Cards in one row arrive one after another (3 per row on a
            // laptop). "grid" lets the card fill the whole row height.
            <Reveal key={destination.id} className="grid" delay={(index % 3) * 0.1}>
              <Link
                href={`/destinations/${destination.id}`}
                className={cardLink}
              >
                <Card className="overflow-hidden bg-white/15 border border-white/25 shadow-none transition duration-300 motion-safe:hover:-translate-y-1 cursor-pointer h-full flex flex-col">
                  {/* Fixed aspect ratio for card alignment; original photo
                      at full resolution (team request 2026-11-19). */}
                  <div className="aspect-video w-full overflow-hidden bg-muted">
                    <PlacePhoto
                      src={destination.photo_url}
                      alt={destination.name}
                      fullSize={true}
                      className="h-full w-full object-cover"
                    />
                  </div>
                  <CardHeader>
                    <CardTitle className="line-clamp-1 text-lg text-white">
                      {destination.name}
                    </CardTitle>
                    <CardRating ratings={ratings} placeType="destination" placeId={destination.id} />
                  </CardHeader>
                  <CardContent className="flex flex-1 flex-col gap-3">
                    <p className="line-clamp-2 text-sm text-white/90">
                      {destination.description}
                    </p>
                    <div className="space-y-1">
                      <p className="text-xs font-medium text-white/70">Address</p>
                      <p className="text-xs text-white/90">{destination.address}</p>
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
