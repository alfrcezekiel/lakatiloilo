"use client";

import { getAccommodations, getDestinations } from "@/lib/api";
import type { Accommodation, Destination } from "@/lib/api";
import { useState, useEffect, useRef } from "react";
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
          destinations={destinations}
          accommodations={accommodations}
        />
      </section>

      <section className="bg-linear-to-br from-teal-900 to-emerald-800">
        <CategoryList
          destinations={destinations}
          category="mountain"
          title="Mountains & Hiking Spots"
          id="mountain-list"
        />
        <CategoryList
          destinations={destinations}
          category="food"
          title="Foods & Dine-ins"
          id="food-list"
        />
        <CategoryList
          destinations={destinations}
          category="walking"
          title="Walking Areas"
          id="walking-list"
        />
        <CategoryList
          destinations={destinations}
          category="festival"
          title="Festivals"
          id="festival-list"
        />
        <CategoryList
          destinations={destinations}
          category="nature"
          title="Nature & Parks"
          id="nature-list"
        />
        <CategoryList
          destinations={destinations}
          category="heritage"
          title="Heritage Sites"
          id="heritage-list"
        />

        <div id="accommodation-list">
          <AccommodationList accommodations={accommodations} />
        </div>
      </section>

      <DockNavbar />
      <ScrollToTop />

      <Footer />
    </main>
  );
}
