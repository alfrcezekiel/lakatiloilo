import type { Metadata } from "next";
import { cache } from "react";
import { Navigation } from "lucide-react";
import { categoryName, getCategories, getDestination } from "@/lib/api";
import { renamedCategories } from "@/lib/labels";
import type { Destination } from "@/lib/api";
import { locationLabels } from "@/lib/labels";
import { cn } from "@/lib/utils";
import { metaDescription } from "@/lib/meta-description";
import { ReviewsSection } from "@/components/ReviewsSection";
import { Reveal } from "@/components/Reveal";
import { PlaceReviewsProvider, RatingFact } from "@/components/PlaceReviews";
import { LivePlace } from "@/components/LivePlace";
import { PlaceMap } from "@/components/PlaceMap";
import { SectionTabs } from "@/components/PlaceDetailClient";
import {
  directionsUrl,
  Fact,
  KeepExploring,
  PageGlow,
  PanelFact,
  PlaceBody,
  PlaceHero,
  PlaceNav,
  PlacePhotosSection,
  PlaceNotFound,
  QuickFacts,
  SectionHeading,
  SidePanel,
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
// apart (evaluation B2, 2026-11-04; WCAG 2.4.2 Page Titled). It also gives
// search engines a summary of the place (Lighthouse SEO, 2026-11-18).
export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { destination, failed } = await load((await params).id);
  if (destination) {
    return {
      title: `${destination.name} · Lakat Iloilo`,
      // The summary search results show under the title (SEO).
      description: metaDescription(destination.description, destination.name),
    };
  }
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
  // A built-in one the team renamed (ticket 141) shows its new name.
  const renamed = renamedCategories(await getCategories().catch(() => []));
  const category =
    renamed[destination.category] ??
    categoryLabels[destination.category] ??
    (await categoryName(destination.category));
  const area = locationLabels[destination.location_type] ?? destination.location_type;
  const photoCount = destination.photos?.length ?? 0;
  // Number(): a database decimal can arrive as a string; the map and the
  // short coordinates need real numbers.
  const latitude = Number(destination.latitude);
  const longitude = Number(destination.longitude);
  const coordinates = `${destination.latitude}° N, ${destination.longitude}° E`;

  // Glass detail pages round (2026-11-22): the "Destination detail —
  // desktop" design. Only real data from the database is shown. The map
  // (src/components/PlaceMap.tsx) is now in scope; update docs/SPEC.md.
  const tabs = [
    { id: "overview", label: "Overview" },
    ...(photoCount > 0 ? [{ id: "photos", label: "Photos" }] : []),
    { id: "location", label: "Location" },
    { id: "reviews", label: "Reviews" },
  ];
  // Numbered section labels ("02 — Gallery") follow the sections shown.
  const number = (id: string) => String(tabs.findIndex((t) => t.id === id) + 1).padStart(2, "0");

  return (
    <main className={cn("relative min-h-screen overflow-hidden", tones.destination.page)}>
      <PageGlow tone="destination" />
      <PlaceNav
        tone="destination"
        crumbs={[
          { label: "Home", href: "/" },
          { label: "Destinations", href: "/#explore-categories" },
          { label: category, href: `/#${destination.category}-list` },
          { label: destination.name },
        ]}
      />
      <PlaceHero
        tone="destination"
        photoUrl={destination.photo_url}
        name={destination.name}
        chips={[category, area]}
        address={destination.address}
        photoCredit={destination.photo_credit}
        photoCount={photoCount}
      />

      <PlaceReviewsProvider placeType="destination" placeId={destination.id}>
        {/* Live updates: this page refreshes when the place changes (ticket 91). */}
        <LivePlace placeType="destination" placeId={destination.id} />
        <QuickFacts>
          <Fact label="Category">{category}</Fact>
          <Fact label="Area">{area}</Fact>
          <RatingFact />
          <Fact label="Coordinates">
            <span className="[font-family:var(--font-plex-mono)] text-sm sm:text-[15px]">
              {latitude.toFixed(4)}, {longitude.toFixed(4)}
            </span>
          </Fact>
        </QuickFacts>
        <SectionTabs tone="destination" tabs={tabs} />
        <PlaceBody
          main={
            <>
              <Reveal>
                <section id="overview" className="scroll-mt-36">
                  <SectionHeading eyebrow={`${number("overview")} — About`}>About</SectionHeading>
                  <p className="max-w-[68ch] text-lg leading-relaxed text-white/90">{destination.description}</p>
                </section>
              </Reveal>
              {/* Its other allowed photos (ticket 146). */}
              <PlacePhotosSection
                name={destination.name}
                photos={destination.photos}
                eyebrow={`${number("photos")} — Gallery`}
              />
              <Reveal>
                <section id="location" className="scroll-mt-36" aria-labelledby="location-heading">
                  <SectionHeading id="location-heading" eyebrow={`${number("location")} — Location`}>
                    Getting there
                  </SectionHeading>
                  <PlaceMap
                    tone="destination"
                    name={destination.name}
                    address={destination.address}
                    latitude={latitude}
                    longitude={longitude}
                  />
                </section>
              </Reveal>
            </>
          }
          aside={
            <div className="space-y-4">
              <SidePanel
                eyebrow="Plan your visit"
                title="Where to find it"
                primary={{
                  label: "Get directions",
                  href: directionsUrl(latitude, longitude),
                  icon: <Navigation aria-hidden="true" />,
                  external: true,
                }}
              >
                <PanelFact label="Address">{destination.address}</PanelFact>
                <PanelFact label="Coordinates" copy={`${destination.latitude}, ${destination.longitude}`} mono>
                  {coordinates}
                </PanelFact>
                <PanelFact label="Category">{category}</PanelFact>
              </SidePanel>
              <KeepExploring
                tone="destination"
                links={[
                  { label: `More: ${category}`, hint: "Places like this one", href: `/#${destination.category}-list` },
                  { label: "Places to stay", hint: "Hotels, resorts and homestays", href: "/#accommodation-list" },
                ]}
              />
            </div>
          }
          reviews={
            <div id="reviews" className="scroll-mt-36">
              <ReviewsSection eyebrow={`${number("reviews")} — Travelers say`} />
            </div>
          }
        />
      </PlaceReviewsProvider>
    </main>
  );
}
