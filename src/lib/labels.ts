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

// The `location_type` column of both tables.
export const locationLabels: Record<string, string> = {
  iloilo_city: "Iloilo City",
  iloilo_province: "Iloilo Province",
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
