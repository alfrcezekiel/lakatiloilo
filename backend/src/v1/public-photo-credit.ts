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

// THE rule for "may travelers see this photo?", in one place (code review
// 2026-11-12): its credits are saved with any status but "Not checked
// yet". Used for the public photo and credit line here, the Photo credits
// page (photo-credits/) and the dashboard's "Credit missing" label
// (admin/admin-places.service.ts), so the three always agree. `table` is
// the alias of place_photo_credits in the query, if it has one. Fixed
// text only, never anything from a request.
export const photoAllowedSql = (table?: 'pc') =>
  `${table ? `${table}.` : ''}authorization_status <> 'not_checked'`;

const ALLOWED = photoAllowedSql('pc');

// A place's cover photo (photo 1, supabase/sql/059) and its credits: the
// photo the cards and the top of the place page show.
const COVER_CREDITS = `public.place_photo_credits pc
       join public.place_photos pp on pp.id = pc.photo_id and pp.position = 1`;

// A place's credit line, or null when its photo has no allowed credits
// (then the photo is not shown either).
export async function photoCreditOf(
  manager: EntityManager,
  type: PlaceType,
  id: string,
): Promise<PublicPhotoCredit | null> {
  const [row]: PublicPhotoCredit[] = await manager.query(
    `select pc.credit_line, pc.licence, pc.source_url
       from ${COVER_CREDITS}
      where pp.place_type = $1 and pp.place_id = $2 and ${ALLOWED}`,
    [type, id],
  );
  return row ?? null;
}

// A place's other photos travelers may see (admin extras round, ticket
// 146): photos 2 to 6 whose credits are allowed, in order, each with its
// credit line. The cover stays at the top of the page (photoCreditOf).
export interface PublicPlacePhoto extends PublicPhotoCredit {
  id: string;
  url: string;
}

export async function morePhotosOf(
  manager: EntityManager,
  type: PlaceType,
  id: string,
): Promise<PublicPlacePhoto[]> {
  return manager.query(
    `select pp.id, pp.photo_url as url, pc.credit_line, pc.licence, pc.source_url
       from public.place_photos pp
       join public.place_photo_credits pc on pc.photo_id = pp.id
      where pp.place_type = $1 and pp.place_id = $2 and pp.position > 1 and ${ALLOWED}
      order by pp.position`,
    [type, id],
  );
}

// The places of one type whose cover photo may be shown.
async function allowedPhotoIds(manager: EntityManager, type: PlaceType): Promise<Set<string>> {
  const rows: { place_id: string }[] = await manager.query(
    `select pp.place_id from ${COVER_CREDITS} where pp.place_type = $1 and ${ALLOWED}`,
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
