import type { EntityManager } from 'typeorm';

// What travelers get of a place photo's credits (photo credits round,
// tickets 135, 136 and 138; table place_photo_credits, supabase/sql/054
// and 055). Read through the backend's own database login.
//
// Ticket 138 (team request 2026-11-11): a place's own photo is shown to
// travelers only once its credits are saved with a status other than
// "Not checked yet" (Allowed by its licence, Permission from the owner,
// or Our team's own photo). Until then the public answers carry no photo
// (photo_url null), and the website shows the Lakat Iloilo splash art.
// The dashboard still sees the real photo.

export type PlaceType = 'destination' | 'accommodation';

// The credit line under the photo. Never the authorization status, which
// is for the team.
export interface PublicPhotoCredit {
  credit_line: string;
  licence: string;
  source_url: string;
}

const ALLOWED = "authorization_status <> 'not_checked'";

// A place's credit line, or null when its photo has no allowed credits
// (then the photo is not shown either).
export async function photoCreditOf(
  manager: EntityManager,
  type: PlaceType,
  id: string,
): Promise<PublicPhotoCredit | null> {
  const [row]: PublicPhotoCredit[] = await manager.query(
    `select credit_line, licence, source_url
       from public.place_photo_credits
      where place_type = $1 and place_id = $2 and ${ALLOWED}`,
    [type, id],
  );
  return row ?? null;
}

// The places of one type whose photo may be shown.
async function allowedPhotoIds(manager: EntityManager, type: PlaceType): Promise<Set<string>> {
  const rows: { place_id: string }[] = await manager.query(
    `select place_id from public.place_photo_credits where place_type = $1 and ${ALLOWED}`,
    [type],
  );
  return new Set(rows.map((row) => row.place_id));
}

// The same places, each with photo_url null unless its photo may be shown.
export type WithAllowedPhoto<T> = Omit<T, 'photo_url'> & { photo_url: string | null };

export async function withAllowedPhotos<T extends { id: string; photo_url: string | null }>(
  manager: EntityManager,
  type: PlaceType,
  places: T[],
): Promise<WithAllowedPhoto<T>[]> {
  const allowed = await allowedPhotoIds(manager, type);
  return places.map((place) => (allowed.has(place.id) ? place : { ...place, photo_url: null }));
}
