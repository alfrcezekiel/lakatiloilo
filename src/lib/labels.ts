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

// The names the eight built-in categories and kinds started with in the
// database (supabase/sql/047), the same as the chips above.
const BUILT_IN_NAMES: Record<string, string> = {
  mountain: "Mountains",
  food: "Food",
  festival: "Festivals",
  walking: "Walking Areas",
  nature: "Nature & Parks",
  heritage: "Heritage Sites",
  hotel: "Hotels",
  condominium: "Condominiums",
};

// The built-in ones the team renamed on the dashboard (admin extras round,
// ticket 141): id -> its new name. A renamed one shows its new name
// everywhere (chips, search, cards, list headings, place pages); one that
// still has its first name keeps the wording written for it below (for
// example "Mountains & Hiking Spots"), so nothing changes until someone
// renames it.
export function renamedCategories(categories: { id: string; name: string }[]): Record<string, string> {
  return Object.fromEntries(
    categories
      .filter((category) => category.id in BUILT_IN_NAMES && category.name !== BUILT_IN_NAMES[category.id])
      .map((category) => [category.id, category.name]),
  );
}

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
  // The photo for its card: the one the team chose (ticket 142), else its
  // first place's.
  imageUrl: string;
  // The icon the team chose for its card (ticket 142), or null.
  icon?: string | null;
}

type CategoryRow = {
  id: string;
  name: string;
  applies_to: "destination" | "accommodation";
  icon?: string | null;
  photo_place_id?: string | null;
};
type PlaceWithPhoto = { id: string; photo_url: string | null };

// The photo the team chose for a category's card (ticket 142): that
// place's photo, or the splash art while its credits are not allowed (the
// backend sends no photo then). Undefined when none was chosen, or that
// place is no longer in the category, so the card keeps its default.
function chosenPhoto(category: CategoryRow, places: PlaceWithPhoto[]): string | undefined {
  if (!category.photo_place_id) return undefined;
  const place = places.find((p) => p.id === category.photo_place_id);
  return place ? (place.photo_url ?? SPLASH_ART) : undefined;
}

// The built-in ones' cards (ticket 142): the icon and photo the team chose,
// if any; the home page keeps their own otherwise.
export function builtInLooks(
  categories: CategoryRow[],
  destinations: (PlaceWithPhoto & { category: string })[],
  accommodations: (PlaceWithPhoto & { type: string })[],
): Record<string, { icon: string | null; imageUrl?: string }> {
  return Object.fromEntries(
    categories
      .filter((category) => category.id in categoryLabels)
      .map((category) => [
        category.id,
        {
          icon: category.icon ?? null,
          imageUrl: chosenPhoto(
            category,
            category.applies_to === "destination"
              ? destinations.filter((d) => d.category === category.id)
              : accommodations.filter((a) => a.type === category.id),
          ),
        },
      ]),
  );
}

export function extraCategories(
  categories: CategoryRow[],
  destinations: (PlaceWithPhoto & { category: string })[],
  accommodations: (PlaceWithPhoto & { type: string })[],
): ExtraCategory[] {
  return categories
    .filter((category) => !(category.id in categoryLabels))
    .flatMap((category) => {
      // Its first place, preferring one whose photo may be shown.
      const places: PlaceWithPhoto[] =
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
              // The team's chosen photo (ticket 142), else its first
              // place's. Ticket 138: a place photo without allowed
              // credits is not sent, so the card uses the splash art then.
              imageUrl: chosenPhoto(category, places) ?? first.photo_url ?? SPLASH_ART,
              icon: category.icon ?? null,
            },
          ]
        : [];
    });
}
