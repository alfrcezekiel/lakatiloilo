"use client";

import { useMemo } from "react";
import type { Accommodation, Destination } from "@/lib/api";
import { locationFilters, sectionTitles } from "@/lib/labels";
import { scrollToSection } from "@/lib/utils/scroll";
import { Skeleton } from "@/components/ui/skeleton";

// Card names come from src/lib/labels.ts, so they match the list headings.
const categories = [
  { id: "mountain", emoji: "⛰️" },
  { id: "food", emoji: "🍜" },
  { id: "walking", emoji: "🚶" },
  { id: "festival", emoji: "🎉" },
  { id: "nature", emoji: "🌳" },
  { id: "heritage", emoji: "🏛️" },
  { id: "hotel", emoji: "🏨" },
  { id: "condominium", emoji: "🏢" },
].map((category) => ({ ...category, name: sectionTitles[category.id] }));

// Real photos from Iloilo City and Province, from Wikimedia Commons under
// free licences. Credits are in src/lib/photo-credits.ts.
const categoryImages = {
  mountain:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/0/0d/San_Joaquin_Pitogo_mountains%2C_terraces_%28San_Joaquin%2C_Iloilo%3B_01-24-2023%29.jpg/1280px-San_Joaquin_Pitogo_mountains%2C_terraces_%28San_Joaquin%2C_Iloilo%3B_01-24-2023%29.jpg",
  food:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Iloilo_Batchoy_with_Puto.jpg/1280px-Iloilo_Batchoy_with_Puto.jpg",
  walking:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/35/Iloilo_Calle_Real_JM_Basa%2C_Celso_Ledesma_%28Iloilo_City%3B_01-21-2023%29.jpg/1280px-Iloilo_Calle_Real_JM_Basa%2C_Celso_Ledesma_%28Iloilo_City%3B_01-21-2023%29.jpg",
  festival:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/9/97/Dinagyang_Festival_Warrior.jpg/1280px-Dinagyang_Festival_Warrior.jpg",
  nature:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a6/Bucari_Pine_Forest.jpg/1280px-Bucari_Pine_Forest.jpg",
  heritage:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/3/31/Molo_Church_and_Molo_Plaza_with_Fountain.jpg/1280px-Molo_Church_and_Molo_Plaza_with_Fountain.jpg",
  hotel:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Seda_Hotel_Iloilo.jpg/1280px-Seda_Hotel_Iloilo.jpg",
  condominium:
    "https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Iloilo_Business_Park_north_condos_top_view_%28Mandurriao%2C_Iloilo_City%3B_01-26-2023%29.jpg/1280px-Iloilo_Business_Park_north_condos_top_view_%28Mandurriao%2C_Iloilo_City%3B_01-26-2023%29.jpg",
};

interface CategoryExploreSectionProps {
  // Both lists arrive already filtered by location by the home page.
  destinations: Destination[];
  accommodations: Accommodation[];
  selectedLocation: string;
  onLocationChange: (location: string) => void;
  // True while the home page is still waiting for the backend. The counts
  // show a skeleton instead of "0 places" until the real numbers arrive.
  loading: boolean;
}

export function CategoryExploreSection({
  destinations,
  accommodations,
  selectedLocation,
  onLocationChange,
  loading,
}: CategoryExploreSectionProps) {

  const categorySectionIds: Record<string, string> = {
    mountain: "mountain-list",
    food: "food-list",
    walking: "walking-list",
    festival: "festival-list",
    nature: "nature-list",
    heritage: "heritage-list",
    hotel: "accommodation-list",
    condominium: "accommodation-list",
  };

  // Count places per category from the lists the home page already loaded,
  // so changing the location filter needs no new request to the backend.
  // Both lists arrive already filtered by location.
  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    destinations.forEach((dest) => {
      counts[dest.category] = (counts[dest.category] || 0) + 1;
    });
    accommodations.forEach((acc) => {
      counts[acc.type] = (counts[acc.type] || 0) + 1;
    });
    return counts;
  }, [destinations, accommodations]);

  return (
    // id: target of the "Explore" links in the dock navbar and the footer.
    // scroll-mt-24 stops the scroll below the floating navbar, so the
    // heading is not hidden behind it.
    <section id="explore-categories" className="scroll-mt-24 py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4 font-fraunces">
            What do you want to explore?
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto font-inter">
            Discover diverse destinations across Iloilo—from mountains and food spots to festivals and heritage sites.
          </p>
        </div>

        <div className="flex justify-center mb-8">
          <div className="inline-flex bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-1">
            {locationFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onLocationChange(filter.id)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedLocation === filter.id
                    ? "bg-white text-teal-900"
                    : "text-white hover:bg-white/10"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((category) => {
            const count = categoryCounts[category.id] || 0;
            const imageUrl = categoryImages[category.id as keyof typeof categoryImages];
            const sectionId = categorySectionIds[category.id];

            return (
              <div
                key={category.id}
                className="relative group overflow-hidden rounded-2xl h-48 cursor-pointer"
                onClick={() => {
                  if (sectionId) {
                    scrollToSection(sectionId);
                  }
                }}
              >
                <div
                  className="absolute inset-0 bg-cover bg-center transition-transform duration-300 group-hover:scale-110"
                  style={{ backgroundImage: `url(${imageUrl})` }}
                />
                <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
                <div className="absolute inset-0 flex flex-col justify-end p-6">
                  <div className="text-4xl mb-2">{category.emoji}</div>
                  <h3 className="text-xl font-semibold text-white mb-1">
                    {category.name}
                  </h3>
                  {loading ? (
                    <Skeleton className="h-5 w-20" />
                  ) : (
                    <p className="text-white/90 text-sm">
                      {count} place{count !== 1 ? "s" : ""} →
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
