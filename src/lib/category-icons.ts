import {
  BedDouble,
  Building2,
  Camera,
  Church,
  Coffee,
  Footprints,
  Hotel,
  Landmark,
  MapPin,
  Mountain,
  PartyPopper,
  Ship,
  Tent,
  TreePalm,
  Trees,
  UtensilsCrossed,
  Waves,
  type LucideIcon,
} from "lucide-react";

// The icons a category's card can have on the home page (admin extras
// round, ticket 142). The ids are what the database keeps
// (place_categories.icon, supabase/sql/058); the labels are what the
// dashboard's picker says.
export const CATEGORY_ICONS = [
  { id: "mountain", label: "Mountain", Icon: Mountain },
  { id: "utensils", label: "Food", Icon: UtensilsCrossed },
  { id: "footprints", label: "Walking", Icon: Footprints },
  { id: "party", label: "Festival", Icon: PartyPopper },
  { id: "trees", label: "Trees", Icon: Trees },
  { id: "landmark", label: "Landmark", Icon: Landmark },
  { id: "hotel", label: "Hotel", Icon: Hotel },
  { id: "building", label: "Building", Icon: Building2 },
  { id: "waves", label: "Beach", Icon: Waves },
  { id: "tent", label: "Camping", Icon: Tent },
  { id: "coffee", label: "Café", Icon: Coffee },
  { id: "church", label: "Church", Icon: Church },
  { id: "camera", label: "Sights", Icon: Camera },
  { id: "ship", label: "Island", Icon: Ship },
  { id: "palm", label: "Resort", Icon: TreePalm },
  { id: "pin", label: "Pin", Icon: MapPin },
] as const;

export type CategoryIconId = (typeof CATEGORY_ICONS)[number]["id"];

const byId: Record<string, LucideIcon> = Object.fromEntries(CATEGORY_ICONS.map((i) => [i.id, i.Icon]));

// The eight built-in ones' own icons (unchanged since ticket 117).
export const BUILT_IN_ICONS: Record<string, LucideIcon> = {
  mountain: Mountain,
  food: UtensilsCrossed,
  walking: Footprints,
  festival: PartyPopper,
  nature: Trees,
  heritage: Landmark,
  hotel: Hotel,
  condominium: Building2,
};

// The icon a category's card shows: the one the team chose, else its own
// built-in one, else a pin (destinations) or a bed (accommodations).
export function iconFor(
  id: string,
  chosen: string | null | undefined,
  appliesTo: "destination" | "accommodation",
): LucideIcon {
  return (
    (chosen ? byId[chosen] : undefined) ??
    BUILT_IN_ICONS[id] ??
    (appliesTo === "destination" ? MapPin : BedDouble)
  );
}
