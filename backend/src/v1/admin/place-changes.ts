import { BadRequestException, NotFoundException } from '@nestjs/common';
import type { PlacePhotoDto, SavedPhotoCredits } from './photo-credits';

// The places on the dashboard: their types, and the checks on what the
// place form sends (tickets 112, 118, 120). Moved out of
// admin-places.service.ts in the code review of 2026-11-12, which had
// passed 400 lines; the service keeps the database work.

export type AdminPlaceType = 'destination' | 'accommodation';
export const ADMIN_PLACE_TYPES: AdminPlaceType[] = ['destination', 'accommodation'];

// One row of the Places list (ticket 112).
export interface AdminPlaceRow {
  id: string;
  type: AdminPlaceType;
  name: string;
  // A destination's category (mountain, beach, ...) or an accommodation's
  // kind (hotel, resort, ...).
  kind: string;
  address: string;
  location_type: string;
  // How many reviews it has, hidden ones too (for Delete, ticket 121).
  review_count: number;
  // For sorting the list (ticket 129): when it was added, and its average
  // stars from the reviews travelers see (null without any).
  created_at: Date;
  average_rating: number | null;
  // The place's photo, for the category card photo picker (ticket 142).
  photo_url: string | null;
  // No photo credits yet, or marked "Not checked yet" (ticket 134).
  credit_missing: boolean;
}

// One place as the Edit form needs it. phone and email are only for
// accommodations (always null for destinations).
export interface AdminPlaceDetails {
  id: string;
  type: AdminPlaceType;
  name: string;
  description: string;
  address: string;
  phone: string | null;
  email: string | null;
  kind: string;
  // "iloilo_city" or "iloilo_province".
  location_type: string;
  latitude: number;
  longitude: number;
  photo_url: string | null;
  updated_at: Date;
  // The photo's credits and copyright, or null before any are saved
  // (photo credits round, ticket 132).
  credits: SavedPhotoCredits | null;
  // Every photo of the place, cover first, each with its credits (admin
  // extras round, ticket 144).
  photos: PlacePhotoDto[];
}

// What the team may change (the columns supabase/sql/043 and 048 allow).
export interface PlaceChanges {
  name: string;
  description: string;
  address: string;
  phone: string | null;
  email: string | null;
  // The category (destination) or kind (accommodation): an id from
  // place_categories.
  kind: string;
  location_type: LocationType;
  latitude: number;
  longitude: number;
}

export type LocationType = 'iloilo_city' | 'iloilo_province';
const LOCATION_TYPES: LocationType[] = ['iloilo_city', 'iloilo_province'];

// Inside Iloilo, the same box as the database (048).
export const ILOILO = { latitude: [10.4, 11.7], longitude: [121.8, 123.3] } as const;

// A number from the form: a number, or text like "10.72". NaN otherwise.
const numberFrom = (value: unknown) =>
  typeof value === 'number'
    ? value
    : typeof value === 'string' && /^-?\d+(\.\d+)?$/.test(value.trim())
      ? Number(value.trim())
      : NaN;

// The same limits as the database (043; description raised to 3000 in
// migration 20261128064903), with plain messages.
export const PLACE_LIMITS = { name: 100, address: 200, description: 3000, phone: 40, email: 120 };

export const placeNotFound = () => new NotFoundException("We couldn't find that place.");

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');

// Checks what the form sent and answers with a plain sentence for the
// first problem. Phone and email may be left empty (saved as nothing);
// for destinations they are ignored.
export function placeChangesFrom(type: AdminPlaceType, body: Record<string, unknown> | undefined): PlaceChanges {
  const name = text(body?.name);
  const description = text(body?.description);
  const address = text(body?.address);
  if (name.length < 1 || name.length > PLACE_LIMITS.name) {
    throw new BadRequestException(`Please write a name of 1 to ${PLACE_LIMITS.name} characters.`);
  }
  if (description.length < 1 || description.length > PLACE_LIMITS.description) {
    throw new BadRequestException(
      `Please write a description of 1 to ${PLACE_LIMITS.description} characters.`,
    );
  }
  if (address.length < 1 || address.length > PLACE_LIMITS.address) {
    throw new BadRequestException(`Please write an address of 1 to ${PLACE_LIMITS.address} characters.`);
  }
  // Category or kind, location and map position (ticket 118). Whether the
  // category or kind is in the list is checked by the database (047).
  const kind = text(body?.kind);
  if (!/^[a-z0-9]+(_[a-z0-9]+)*$/.test(kind)) {
    throw new BadRequestException(
      type === 'destination' ? 'Please choose a category.' : 'Please choose a kind.',
    );
  }
  const locationType = body?.location_type;
  if (!LOCATION_TYPES.includes(locationType as LocationType)) {
    throw new BadRequestException('Please choose Iloilo City or Iloilo Province.');
  }
  const latitude = numberFrom(body?.latitude);
  const longitude = numberFrom(body?.longitude);
  if (!(latitude >= ILOILO.latitude[0] && latitude <= ILOILO.latitude[1])) {
    throw new BadRequestException(
      `Please write a latitude inside Iloilo, from ${ILOILO.latitude[0]} to ${ILOILO.latitude[1]}.`,
    );
  }
  if (!(longitude >= ILOILO.longitude[0] && longitude <= ILOILO.longitude[1])) {
    throw new BadRequestException(
      `Please write a longitude inside Iloilo, from ${ILOILO.longitude[0]} to ${ILOILO.longitude[1]}.`,
    );
  }
  const where = { kind, location_type: locationType as LocationType, latitude, longitude };
  if (type === 'destination') return { name, description, address, phone: null, email: null, ...where };

  const phone = text(body?.phone);
  const email = text(body?.email);
  if (phone.length > PLACE_LIMITS.phone || (phone && !/^[0-9+()\-.\s]+$/.test(phone))) {
    throw new BadRequestException(
      `Please write the phone number with digits, spaces, + ( ) - only, up to ${PLACE_LIMITS.phone} characters.`,
    );
  }
  if (email.length > PLACE_LIMITS.email || (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))) {
    throw new BadRequestException('Please write a valid email address, or leave it empty.');
  }
  return { name, description, address, phone: phone || null, email: email || null, ...where };
}

// "destination" or "accommodation" in the address; anything else is not a
// place, so 404 like an unknown id. Shared by AdminController and
// AdminTrashController.
export const placeType = (type: string): AdminPlaceType => {
  if (!ADMIN_PLACE_TYPES.includes(type as AdminPlaceType)) throw placeNotFound();
  return type as AdminPlaceType;
};
