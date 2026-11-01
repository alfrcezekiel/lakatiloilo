import { getDestination } from "@/lib/api";
import type { Destination } from "@/lib/api";
import { locationLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Reveal } from "@/components/Reveal";
import { PlaceReviewsProvider, RatingTile } from "@/components/PlaceReviews";
import {
  PanelFact,
  PlaceBody,
  PlaceHero,
  PlaceNotFound,
  SectionHeading,
  SidePanel,
  StatTile,
  tones,
} from "@/components/PlaceDetail";

// Longer names for the detail page; the short names used elsewhere live in
// src/lib/labels.ts.
const categoryLabels: Record<string, string> = {
  mountain: "Mountains & Hiking",
  food: "Food & Dine-in",
  walking: "Walking Area",
  festival: "Festival",
  nature: "Nature & Parks",
  heritage: "Heritage Site",
};

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  let destination: Destination | null = null;
  let error: Error | null = null;
  try {
    destination = await getDestination(id);
  } catch (e) {
    error = e instanceof Error ? e : new Error(String(e));
  }

  if (error || !destination) {
    return <PlaceNotFound tone="destination" what="Destination" message={error?.message} />;
  }

  const category = categoryLabels[destination.category] ?? destination.category;
  const area = locationLabels[destination.location_type] ?? destination.location_type;

  // Only real data from the database is shown here. Maps are out of scope
  // for the MVP (see docs/SPEC.md).
  return (
    <main className={cn("min-h-screen", tones.destination.page)}>
      <PlaceHero
        tone="destination"
        photoUrl={destination.photo_url}
        name={destination.name}
        chips={[category, area]}
        address={destination.address}
      />

      <PlaceReviewsProvider placeType="destination" placeId={destination.id}>
        <PlaceBody
          main={
            <>
              <Reveal className="grid grid-cols-3 gap-2 sm:gap-3">
                <StatTile label="Category">{category}</StatTile>
                <StatTile label="Area">{area}</StatTile>
                <RatingTile />
              </Reveal>
              <Reveal>
                <section>
                  <SectionHeading>About</SectionHeading>
                  <p className="text-white/90 leading-relaxed">{destination.description}</p>
                </section>
              </Reveal>
            </>
          }
          aside={
            <SidePanel eyebrow="Plan your visit" title="Where to find it">
              <PanelFact label="Address">{destination.address}</PanelFact>
              <PanelFact label="Coordinates">
                {destination.latitude}° N, {destination.longitude}° E
              </PanelFact>
            </SidePanel>
          }
          reviews={<ReviewsSection />}
        />
      </PlaceReviewsProvider>
    </main>
  );
}
