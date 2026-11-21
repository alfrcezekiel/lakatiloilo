"use client";

import type { Accommodation, Destination, PlaceCategory, PlaceRating } from "@/lib/api";
import { ratingKey, type RatingsByPlace } from "@/components/CardRating";
import { useState, useEffect, useMemo, useRef, startTransition } from "react";
import { useRouter } from "next/navigation";
import { useTableChanges } from "@/lib/realtime";
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
import { builtInLooks, extraCategories, renamedCategories, sectionTitles } from "@/lib/labels";

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
  // Every reviewed place's rating (GET /v1/ratings); null if it failed.
  ratings: PlaceRating[] | null;
  // The team's categories and kinds (GET /v1/categories); null if it failed.
  categories: PlaceCategory[] | null;
  failed: boolean;
};

// The tables whose changes the home page shows: the places themselves, and
// reviews (they change the star ratings on the cards).
// review_visibility_signals: a hidden or shown review changes a card's
// rating (ticket 109).
const HOME_TABLES = [
  "destinations",
  "accommodations",
  "reviews",
  "review_visibility_signals",
  // A category or kind added or deleted from the dashboard (ticket 117).
  "place_categories",
] as const;

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
  // Ratings for the cards, looked up by place (null if they failed).
  const [ratings, setRatings] = useState<RatingsByPlace>(null);
  // The team's categories and kinds (ticket 117); empty until they arrive.
  const [categories, setCategories] = useState<PlaceCategory[]>([]);

  // Live updates (ticket 90): when a destination, accommodation or review
  // changes anywhere, Supabase Realtime rings and the page asks the Next.js
  // server to load the places and ratings from the backend again
  // (router.refresh). Only the server part is redone: the scroll position,
  // the search text and the chosen category stay as they are, and the new
  // places arrive through `places` below.
  const router = useRouter();
  useTableChanges(HOME_TABLES, router.refresh);
  // True once places have shown, so a live refresh that fails keeps them.
  const loadedOnce = useRef(false);

  // Wait for the places the server is fetching. Child components get the
  // lists as props instead of fetching again.
  useEffect(() => {
    let cancelled = false;
    places.then((result) => {
      if (cancelled) return;
      // A live refresh that could not reach the backend keeps the cards and
      // ratings already on screen instead of emptying them.
      if (result.failed && loadedOnce.current) return;
      loadedOnce.current = !result.failed;
      // Drawing every card at once (about 50) kept a phone busy for a
      // quarter of a second in one piece, so a tap then did nothing
      // (Lighthouse TBT, ticket 158). startTransition lets React draw them
      // in small pieces and answer the traveler in between. Nothing on
      // screen changes: the skeletons stay until the cards are ready.
      startTransition(() => {
        setDestinations(result.destinations);
        setAccommodations(result.accommodations);
        // Ratings that fail on a live refresh keep the ones on screen.
        setRatings((current) =>
          result.ratings
            ? new Map(result.ratings.map((r) => [ratingKey(r.place_type, r.place_id), r]))
            : loadedOnce.current
              ? current
              : null,
        );
        // Categories that fail on a live refresh keep the ones on screen.
        if (result.categories) setCategories(result.categories);
        setLoadError(result.failed);
        setLoading(false);
      });
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

  // Categories and kinds added from the dashboard that have at least one
  // place (ticket 117): each gets a chip, a card and a list like the eight
  // built-in ones. Worked out from every place, whatever the location
  // filter, so a card does not come and go with the filter.
  const extras = useMemo(
    () => extraCategories(categories, destinations, accommodations),
    [categories, destinations, accommodations],
  );
  // Built-in ones the team renamed (ticket 141): their new names win.
  const renamed = useMemo(() => renamedCategories(categories), [categories]);
  // The icon and photo the team chose for the built-in cards (ticket 142).
  const looks = useMemo(
    () => builtInLooks(categories, destinations, accommodations),
    [categories, destinations, accommodations],
  );
  const extraNames = useMemo(
    () => ({ ...renamed, ...Object.fromEntries(extras.map((extra) => [extra.id, extra.name])) }),
    [renamed, extras],
  );

  return (
    <main className="min-h-screen">
      {/* Evaluation 2026-11-12 (WCAG 2.4.1, 2.4.3): "Skip to content" first,
          then the navbar, so keyboard users meet them in the order they see
          them. The navbar used to come after the whole page, so the bell
          and account menu were the 62nd Tab stop; it is fixed at the top,
          so moving it here changes nothing on screen. */}
      <a
        href="#explore"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-60 focus:rounded-lg focus:bg-amber-300 focus:px-3 focus:py-2 focus:font-semibold focus:text-teal-950"
      >
        Skip to content
      </a>
      <DockNavbar />
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
                extraNames={extraNames}
                loading={loading}
              />
            </Reveal>
            <Reveal delay={0.4}>
              <CategoryChips
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                extras={extras}
                renamed={renamed}
              />
            </Reveal>
            <FeaturedCards destinations={destinations} ratings={ratings} loading={loading} />
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
          extras={extras}
          renamed={renamed}
          looks={looks}
          loading={loading}
        />
      </section>

      <section className="bg-linear-to-br from-teal-900 to-emerald-800">
        {loadError && (
          <div className="mx-auto max-w-6xl px-4 pt-16 sm:px-6">
            <div
              role="alert"
              className="rounded-2xl border border-white/25 bg-white/15 p-6 text-white"
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
            title={renamed[section.category] ?? section.title}
            id={`${section.category}-list`}
            ratings={ratings}
            loading={loading}
          />
        ))}

        {/* Destination categories the team added, after the built-in ones. */}
        {extras
          .filter((extra) => extra.appliesTo === "destination")
          .map((extra) => (
            <CategoryList
              key={extra.id}
              destinations={visibleDestinations}
              category={extra.id}
              title={extra.name}
              id={`${extra.id}-list`}
              ratings={ratings}
              loading={loading}
            />
          ))}

        <AccommodationList
          accommodations={visibleAccommodations}
          // A kind the team added shares this list, so its heading widens.
          title={
            extras.some((extra) => extra.appliesTo === "accommodation")
              ? "Places to stay"
              : `${renamed.hotel ?? "Hotels"} & ${renamed.condominium ?? "Condominiums"}`
          }
          id="accommodation-list"
          ratings={ratings}
          loading={loading}
        />
      </section>

      <ScrollToTop />

      <Footer />
    </main>
  );
}
