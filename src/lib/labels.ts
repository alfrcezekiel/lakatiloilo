import { SPLASH_ART } from "@/lib/splash";

// Display names for the values stored in the database, kept in one place so
// every screen spells them the same way. Rename a category here and the
// chips, the search bar and the suggestions all follow.

// The ids match the `category` column of destinations and the `type` column
// of accommodations. Listed in the order the chips appear under the search
// bar, with "all" first.
export const categoryChips = [
  { id: "all", label: "All" },
  { id: "mountain", label: "Mountains" },
  { id: "food", label: "Food" },
  { id: "festival", label: "Festivals" },
  { id: "hotel", label: "Hotels" },
  { id: "condominium", label: "Condominiums" },
  { id: "walking", label: "Walking Areas" },
  { id: "nature", label: "Nature & Parks" },
  { id: "heritage", label: "Heritage Sites" },
];

// "mountain" -> "Mountains", "hotel" -> "Hotels", ...
export const categoryLabels: Record<string, string> = Object.fromEntries(
  categoryChips.map((chip) => [chip.id, chip.label]),
);

// One accommodation's type, for its detail page: "hotel" -> "Hotel". (The
// chips above use the plural, "Hotels".) The ids match the `type` column of
// accommodations.
//
// "­" is a soft hyphen: invisible, unless the word has to break there,
// and then the browser shows "Condo-" on one line and "minium" on the next.
// On a 320 px phone the Type tile is narrower than the whole word, and
// not every phone's browser can work out where to hyphenate by itself.
export const accommodationTypeLabels: Record<string, string> = {
  hotel: "Hotel",
  condominium: "Condo­minium",
};

// The `location_type` column of both tables.
export const locationLabels: Record<string, string> = {
  iloilo_city: "Iloilo City",
  iloilo_province: "Iloilo Province",
};

// A place photo's copyright licence and authorization status (photo
// credits round, ticket 132), as the place form lists them.
export const licenceLabels: Record<string, string> = {
  cc_by_4: "CC BY 4.0",
  cc_by_sa_4: "CC BY-SA 4.0",
  cc0: "CC0 / Public domain",
  all_rights_reserved: "All rights reserved",
  own_photo: "Our team's own photo",
  other: "Other",
};

export const authorizationStatusLabels: Record<string, string> = {
  licence_allows: "Allowed by its licence",
  owner_permission: "Permission from the owner",
  own_photo: "Our team's own photo",
  not_checked: "Not checked yet",
};

// The All / Iloilo City / Iloilo Province filter buttons.
export const locationFilters = [
  { id: "all", label: "All" },
  ...Object.entries(locationLabels).map(([id, label]) => ({ id, label })),
];

// Longer names for the sections further down the home page. The explore
// cards and the list headings both use them, so they always match.
export const sectionTitles: Record<string, string> = {
  mountain: "Mountains & Hiking Spots",
  food: "Foods & Dine-ins",
  walking: "Walking Areas",
  festival: "Festivals",
  nature: "Nature & Parks",
  heritage: "Heritage Sites",
  hotel: "Hotels",
  condominium: "Condominiums",
};

// "I'm traveling as", chosen at sign-up. The ids match the traveler_type
// saved on the account and copied onto each review (supabase/sql/022).
export const travelerTypes = [
  { id: "local", label: "Local Ilonggo" },
  { id: "domestic", label: "Visitor from PH" },
  { id: "foreign", label: "Foreign tourist" },
] as const;

export type TravelerType = (typeof travelerTypes)[number]["id"];

// "local" -> "Local Ilonggo", ...
export const travelerTypeLabels: Record<string, string> = Object.fromEntries(
  travelerTypes.map((type) => [type.id, type.label]),
);

// Categories and kinds the team added from the dashboard (ticket 117).
// The eight above are built into the home page with their own icons and
// photos; any other one from the list (GET /v1/categories) that has at
// least one place gets a chip, a card and a list too, with the photo of
// its first place. One with no places yet is not shown.
export interface ExtraCategory {
  id: string;
  name: string;
  appliesTo: "destination" | "accommodation";
  // The photo of its first place, for its card.
  imageUrl: string;
}

export function extraCategories(
  categories: { id: string; name: string; applies_to: "destination" | "accommodation" }[],
  destinations: { category: string; photo_url: string | null }[],
  accommodations: { type: string; photo_url: string | null }[],
): ExtraCategory[] {
  return categories
    .filter((category) => !(category.id in categoryLabels))
    .flatMap((category) => {
      // Its first place, preferring one whose photo may be shown.
      const places: { photo_url: string | null }[] =
        category.applies_to === "destination"
          ? destinations.filter((d) => d.category === category.id)
          : accommodations.filter((a) => a.type === category.id);
      const first = places.find((p) => p.photo_url) ?? places[0];
      return first
        ? [
            {
              id: category.id,
              name: category.name,
              appliesTo: category.applies_to,
              // Ticket 138: a place photo without allowed credits is not
              // sent, so the card uses the wide splash art then.
              imageUrl: first.photo_url ?? SPLASH_ART,
            },
          ]
        : [];
    });
}
