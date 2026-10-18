"use client";

import { getAccommodations, getDestinations } from "@/lib/api";
import type { Accommodation, Destination } from "@/lib/api";
import { useState, useEffect, useMemo, useRef } from "react";
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

export default function Home() {
  const [destinations, setDestinations] = useState<Destination[]>([]);
  const [accommodations, setAccommodations] = useState<Accommodation[]>([]);
  // "all", "iloilo_city" or "iloilo_province", set by the filter buttons in
  // CategoryExploreSection. Kept here so the lists below use it too.
  const [selectedLocation, setSelectedLocation] = useState("all");

  // The only place the home page loads data: one request per endpoint.
  // Child components get the lists as props instead of fetching again.
  // In development, React Strict Mode runs effects twice; this ref stops
  // the second run from sending the same requests again.
  const hasFetched = useRef(false);

  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    // If the backend can't be reached, the lists just stay empty.
    getDestinations().then(setDestinations).catch(() => {});
    getAccommodations().then(setAccommodations).catch(() => {});
  }, []);

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
      <section id="explore" className="min-h-screen">
        <HeroSection>
          <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
            <SearchBar />
            <div id="categories">
              <CategoryChips />
            </div>
            <FeaturedCards />
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
        />
      </section>

      <section className="bg-linear-to-br from-teal-900 to-emerald-800">
        <CategoryList
          destinations={visibleDestinations}
          category="mountain"
          title="Mountains & Hiking Spots"
          id="mountain-list"
        />
        <CategoryList
          destinations={visibleDestinations}
          category="food"
          title="Foods & Dine-ins"
          id="food-list"
        />
        <CategoryList
          destinations={visibleDestinations}
          category="walking"
          title="Walking Areas"
          id="walking-list"
        />
        <CategoryList
          destinations={visibleDestinations}
          category="festival"
          title="Festivals"
          id="festival-list"
        />
        <CategoryList
          destinations={visibleDestinations}
          category="nature"
          title="Nature & Parks"
          id="nature-list"
        />
        <CategoryList
          destinations={visibleDestinations}
          category="heritage"
          title="Heritage Sites"
          id="heritage-list"
        />

        <AccommodationList
          accommodations={visibleAccommodations}
          id="accommodation-list"
        />
      </section>

      <DockNavbar />
      <ScrollToTop />

      <Footer />
    </main>
  );
}
