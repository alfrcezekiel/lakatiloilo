import { ILOILO, PLACE_LIMITS, type AdminPlaceDetails } from "@/lib/api";
import { locationLabels } from "@/lib/labels";

// The place form's values and checks (Edit place, ticket 112; every field
// since 118; Add a place, 120), the same as the backend's, with a plain
// message under each field. Moved out of AdminPlaceEdit.tsx in the code
// review of 2026-11-11.

export type Fields = {
  name: string;
  description: string;
  address: string;
  kind: string;
  location_type: string;
  latitude: string;
  longitude: string;
  phone: string;
  email: string;
};
export type FieldErrors = Partial<Record<keyof Fields, string>>;

export const EMPTY_FIELDS: Fields = {
  name: "",
  description: "",
  address: "",
  kind: "",
  location_type: "",
  latitude: "",
  longitude: "",
  phone: "",
  email: "",
};

export const fieldsOf = (place: AdminPlaceDetails): Fields => ({
  name: place.name,
  description: place.description,
  address: place.address,
  kind: place.kind,
  location_type: place.location_type,
  latitude: String(place.latitude),
  longitude: String(place.longitude),
  phone: place.phone ?? "",
  email: place.email ?? "",
});

// The same checks as the backend, with a message under each field.
export function check(fields: Fields, isStay: boolean): FieldErrors {
  const errors: FieldErrors = {};
  const name = fields.name.trim();
  const description = fields.description.trim();
  const address = fields.address.trim();
  if (!name) errors.name = "Please write a name.";
  else if (name.length > PLACE_LIMITS.name) errors.name = `Please keep the name to ${PLACE_LIMITS.name} characters.`;
  if (!description) errors.description = "Please write a description.";
  else if (description.length > PLACE_LIMITS.description)
    errors.description = `Please keep the description to ${PLACE_LIMITS.description} characters.`;
  if (!address) errors.address = "Please write an address.";
  else if (address.length > PLACE_LIMITS.address)
    errors.address = `Please keep the address to ${PLACE_LIMITS.address} characters.`;
  if (!fields.kind) errors.kind = isStay ? "Please choose a kind." : "Please choose a category.";
  if (!(fields.location_type in locationLabels))
    errors.location_type = "Please choose Iloilo City or Iloilo Province.";
  // Inside Iloilo, the same box as the backend and the database (048).
  const inside = (text: string, [from, to]: readonly [number, number]) =>
    /^-?\d+(\.\d+)?$/.test(text.trim()) && Number(text) >= from && Number(text) <= to;
  if (!inside(fields.latitude, ILOILO.latitude))
    errors.latitude = `Please write a number from ${ILOILO.latitude[0]} to ${ILOILO.latitude[1]} (inside Iloilo).`;
  if (!inside(fields.longitude, ILOILO.longitude))
    errors.longitude = `Please write a number from ${ILOILO.longitude[0]} to ${ILOILO.longitude[1]} (inside Iloilo).`;
  if (isStay) {
    const phone = fields.phone.trim();
    const email = fields.email.trim();
    if (phone.length > PLACE_LIMITS.phone || (phone && !/^[0-9+()\-.\s]+$/.test(phone)))
      errors.phone = `Use digits, spaces and + ( ) - only, up to ${PLACE_LIMITS.phone} characters, or leave it empty.`;
    if (email.length > PLACE_LIMITS.email || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)))
      errors.email = "Please write a valid email address, or leave it empty.";
  }
  return errors;
}

export const FIELD_ORDER: (keyof Fields)[] = [
  "name",
  "description",
  "address",
  "kind",
  "location_type",
  "latitude",
  "longitude",
  "phone",
  "email",
];
