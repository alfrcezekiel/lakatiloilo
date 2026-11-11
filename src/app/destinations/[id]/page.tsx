import type { Metadata } from "next";
import { cache } from "react";
import { categoryName, getDestination } from "@/lib/api";
import type { Destination } from "@/lib/api";
import { locationLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Reveal } from "@/components/Reveal";
import { PlaceReviewsProvider, RatingTile } from "@/components/PlaceReviews";
import { LivePlace } from "@/components/LivePlace";
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

// cache(): the tab title (generateMetadata) and the page both need the
// destination, and share one backend answer per visit (like the traveler page).
// failed: the backend could not be reached, as opposed to "no such place".
const load = cache(async (id: string): Promise<{ destination: Destination | null; failed: boolean }> => {
  try {
    return { destination: await getDestination(id), failed: false };
  } catch {
    return { destination: null, failed: true };
  }
});

// The tab names the place, so travelers (and screen readers) can tell tabs
// apart (evaluation B2, 2026-11-04; WCAG 2.4.2 Page Titled).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { destination, failed } = await load((await params).id);
  if (destination) return { title: `${destination.name} · Lakat Iloilo` };
  return { title: failed ? "Lakat Iloilo" : "Destination not found · Lakat Iloilo" };
}

export default async function DestinationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { destination, failed } = await load((await params).id);
  if (!destination) {
    return <PlaceNotFound tone="destination" what="Destination" failed={failed} />;
  }

  // A category the team added from the dashboard (ticket 117) is named in
  // the categories list, not in the built-in labels above.
  const category =
    categoryLabels[destination.category] ?? (await categoryName(destination.category));
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
        photoCredit={destination.photo_credit}
      />

      <PlaceReviewsProvider placeType="destination" placeId={destination.id}>
        {/* Live updates: this page refreshes when the place changes (ticket 91). */}
        <LivePlace placeType="destination" placeId={destination.id} />
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
