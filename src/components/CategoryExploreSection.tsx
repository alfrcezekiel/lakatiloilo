"use client";

import { ArrowRight } from "lucide-react";
import { useMemo } from "react";
import type { Accommodation, Destination } from "@/lib/api";
import { iconFor } from "@/lib/category-icons";
import { locationFilters, sectionTitles, type ExtraCategory } from "@/lib/labels";
import { scrollToSection } from "@/lib/utils/scroll";
import { Skeleton } from "@/components/ui/skeleton";
import { Reveal } from "@/components/Reveal";

// Card names come from src/lib/labels.ts, so they match the list headings.
// Their own icons are in src/lib/category-icons.ts (BUILT_IN_ICONS); the
// team can choose another icon and photo per card (ticket 142).
const categories = [
  { id: "mountain", appliesTo: "destination" as const },
  { id: "food", appliesTo: "destination" as const },
  { id: "walking", appliesTo: "destination" as const },
  { id: "festival", appliesTo: "destination" as const },
  { id: "nature", appliesTo: "destination" as const },
  { id: "heritage", appliesTo: "destination" as const },
  { id: "hotel", appliesTo: "accommodation" as const },
  { id: "condominium", appliesTo: "accommodation" as const },
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
  // Categories and kinds the team added (ticket 117): a card each after
  // the built-in ones, with a general icon and its first place's photo.
  extras?: ExtraCategory[];
  // Built-in ones the team renamed (ticket 141): id -> new name.
  renamed?: Record<string, string>;
  // The icon and photo the team chose for built-in cards (ticket 142).
  looks?: Record<string, { icon: string | null; imageUrl?: string }>;
}

export function CategoryExploreSection({
  destinations,
  accommodations,
  selectedLocation,
  onLocationChange,
  loading,
  extras = [],
  renamed = {},
  looks = {},
}: CategoryExploreSectionProps) {
  // The built-in cards, then the team's own: a pin for a destination
  // category, a bed for an accommodation kind.
  const cards = [
    ...categories.map((category) => ({
      ...category,
      name: renamed[category.id] ?? category.name,
      icon: iconFor(category.id, looks[category.id]?.icon, category.appliesTo),
      imageUrl: looks[category.id]?.imageUrl ?? categoryImages[category.id as keyof typeof categoryImages],
      sectionId: undefined as string | undefined,
    })),
    ...extras.map((extra) => ({
      id: extra.id,
      name: extra.name,
      icon: iconFor(extra.id, extra.icon, extra.appliesTo),
      imageUrl: extra.imageUrl,
      sectionId: extra.appliesTo === "destination" ? `${extra.id}-list` : "accommodation-list",
    })),
  ];

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
        <Reveal className="text-center mb-12">
          <h2 className="text-4xl font-bold text-white mb-4 font-fraunces">
            What do you want to explore?
          </h2>
          <p className="text-lg text-white/90 max-w-2xl mx-auto font-inter">
            Discover diverse destinations across Iloilo—from mountains and food spots to festivals and heritage sites.
          </p>
        </Reveal>

        <Reveal delay={0.1} className="flex justify-center mb-8">
          <div className="inline-flex bg-white/10 border border-white/20 rounded-full p-1">
            {locationFilters.map((filter) => (
              <button
                key={filter.id}
                onClick={() => onLocationChange(filter.id)}
                className={`px-6 py-2 rounded-full text-sm font-medium transition-all ${
                  selectedLocation === filter.id
                    ? "bg-white text-teal-900"
                    : "text-white/80 hover:text-white"
                }`}
              >
                {filter.label}
              </button>
            ))}
          </div>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {cards.map((category, index) => {
            const count = categoryCounts[category.id] || 0;
            const imageUrl = category.imageUrl;
            const sectionId = category.sectionId ?? categorySectionIds[category.id];

            return (
              // Cards in one row arrive one after another (4 per row on a
              // laptop).
              <Reveal key={category.id} delay={(index % 4) * 0.08}>
                {/* The button inside the heading covers the whole card
                    (after:inset-0), so the card is one real button for the
                    keyboard and screen readers (evaluation 2026-11-12: it
                    was a div with onClick). */}
                <div className="relative group overflow-hidden rounded-2xl h-48 transition duration-300 hover:shadow-2xl motion-safe:hover:-translate-y-1 has-focus-visible:outline-2 has-focus-visible:outline-offset-4 has-focus-visible:outline-white">
                  <div
                    className="absolute inset-0 bg-cover bg-center transition-transform duration-300 motion-safe:group-hover:scale-110"
                    style={{ backgroundImage: `url(${imageUrl})` }}
                  />
                  <div className="absolute inset-0 bg-linear-to-t from-black/70 via-black/30 to-transparent" />
                  <div className="absolute inset-0 flex flex-col justify-end p-6">
                    <category.icon aria-hidden="true" strokeWidth={1.75} className="size-10 shrink-0 mb-2 text-white" />
                    <h3 className="text-xl font-semibold text-white mb-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (sectionId) scrollToSection(sectionId);
                        }}
                        className="cursor-pointer select-none text-left after:absolute after:inset-0 focus:outline-none"
                      >
                        {category.name}
                      </button>
                    </h3>
                    {loading ? (
                      <Skeleton className="h-5 w-20" />
                    ) : (
                      <p className="flex items-center gap-1 text-white/90 text-sm">
                        {count} place{count !== 1 ? "s" : ""}
                        <ArrowRight aria-hidden="true" className="size-4" />
                      </p>
                    )}
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
