"use client";

import type { Accommodation, Destination } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { HeroSection } from "@/components/HeroSection";
import { SearchBar } from "@/components/SearchBar";
import { CategoryChips } from "@/components/CategoryChips";
import { FeaturedCards } from "@/components/FeaturedCards";
import { AboutIloilo } from "@/components/AboutIloilo";
import { FeaturesSection } from "@/components/FeaturesSection";
import { CategoryExploreSection } from "@/components/CategoryExploreSection";
import { CategoryList } from "@/components/CategoryList";
import { AccommodationList } from "@/components/AccommodationList";
import { Footer } from "@/components/Footer";
import { DockNavbar } from "@/components/DockNavbar";
import { ScrollToTop } from "@/components/ScrollToTop";
import { Reveal } from "@/components/Reveal";
import { sectionTitles } from "@/lib/labels";

// The destination list sections, in the order they appear on the page.
const destinationSections = [
  "mountain",
  "food",
  "walking",
  "festival",
  "nature",
  "heritage",
].map((category) => ({ category, title: sectionTitles[category] }));

// What the server sends for the home page (see src/app/page.tsx). `failed`
// is true when the backend could not be reached.
export type HomePlaces = {
  destinations: Destination[];
  accommodations: Accommodation[];
  failed: boolean;
};

// The home page itself. The Next.js server has already started asking the
// NestJS backend for the places, and passes that request in as `places`:
// the page shows straight away (with skeletons), and fills in when the
// places arrive from the server. The browser never calls the backend's
// place endpoints itself.
export function HomePage({ places }: { places: Promise<HomePlaces> }) {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  // "all", "iloilo_city" or "iloilo_province", set by the filter buttons in
  // CategoryExploreSection. Kept here so the lists below use it too.
  const [selectedLocation, setSelectedLocation] = useState("all");
  // "all" or one chip id ("mountain", "hotel", ...), set by the category
  // chips in the hero. It only affects the search bar (its Category field
  // and suggestions); the sections further down always show every category.
  const [selectedCategory, setSelectedCategory] = useState("all");
  // True when the backend could not be reached, so visitors see a message
  // instead of empty lists with no explanation.
  const [loadError, setLoadError] = useState(false);
  // True until both backend requests have finished (worked or failed).
  // While it is true, sections show skeletons instead of hiding.
  const [loading, setLoading] = useState(true);

  // Wait for the places the server is fetching. Child components get the
  // lists as props instead of fetching again.
  useEffect(() => {
    let cancelled = false;
    places.then((result) => {
      if (cancelled) return;
      setDestinations(result.destinations);
      setAccommodations(result.accommodations);
      setLoadError(result.failed);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [places]);

  // What every section shows: the category cards count these and the lists
  // display them, so both always agree with the location filter.
  const visibleDestinations = useMemo(
    () =>
      selectedLocation === "all"
        ? destinations
        : destinations.filter((d) => d.location_type === selectedLocation),
    [destinations, selectedLocation],
  );

  const visibleAccommodations = useMemo(
    () =>
      selectedLocation === "all"
        ? accommodations
        : accommodations.filter((a) => a.location_type === selectedLocation),
    [accommodations, selectedLocation],
  );

  return (
    <main className="min-h-screen">
      {/* Screen readers hear "Loading places" while the skeletons show. The
          skeletons themselves are hidden from screen readers. */}
      <p role="status" className="sr-only">
        {loading ? "Loading places" : ""}
      </p>
      <section id="explore" className="min-h-screen">
        <HeroSection>
          {/* No padding here: HeroSection already sets the page width and
              side padding, so the search bar lines up with the headline. */}
          <div className="relative z-10">
            <Reveal delay={0.3}>
              <SearchBar
                destinations={destinations}
                accommodations={accommodations}
                selectedCategory={selectedCategory}
                loading={loading}
              />
            </Reveal>
            <Reveal delay={0.4}>
              <CategoryChips
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
              />
            </Reveal>
            <FeaturedCards destinations={destinations} loading={loading} />
          </div>
        </HeroSection>
      </section>

      <section className="bg-linear-to-br from-teal-900 to-emerald-800">
        <div id="about">
          <AboutIloilo />
        </div>
        <div id="features">
          <FeaturesSection />
        </div>
        <CategoryExploreSection
          destinations={visibleDestinations}
          accommodations={visibleAccommodations}
          selectedLocation={selectedLocation}
          onLocationChange={setSelectedLocation}
          loading={loading}
        />
      </section>

      <section className="bg-linear-to-br from-teal-900 to-emerald-800">
        {loadError && (
          <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
            <div
              role="alert"
              className="rounded-2xl border border-white/25 bg-white/15 p-6 text-white backdrop-blur-md"
            >
              <p className="font-semibold">
                We couldn&apos;t load places right now.
              </p>
              <p className="mt-1 text-white/80">
                Please check your connection and try again.
              </p>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-4 rounded-md border border-white/25 bg-white/20 px-4 py-2 text-sm font-medium hover:bg-white/30"
              >
                Try again
              </button>
            </div>
          </div>
        )}
        {destinationSections.map((section) => (
          <CategoryList
            key={section.category}
            destinations={visibleDestinations}
            category={section.category}
            title={section.title}
            id={`${section.category}-list`}
            loading={loading}
          />
        ))}

        <AccommodationList
          accommodations={visibleAccommodations}
          id="accommodation-list"
          loading={loading}
        />
      </section>

      <DockNavbar />
      <ScrollToTop />

      <Footer />
    </main>
  );
}
