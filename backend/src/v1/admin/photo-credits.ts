import { BadRequestException } from '@nestjs/common';
import type { QueryRunner } from 'typeorm';
import type { AdminPlaceType } from './place-changes';

// Photo credits and copyright for a place's photo (photo credits round,
// ticket 132; table place_photo_credits, supabase/sql/054). Saved from the
// box below the photo on the dashboard's place form.

export const LICENCES = ['cc_by_4', 'cc_by_sa_4', 'cc0', 'all_rights_reserved', 'own_photo', 'other'] as const;
export const AUTHORIZATION_STATUSES = ['licence_allows', 'owner_permission', 'own_photo', 'not_checked'] as const;
export type Licence = (typeof LICENCES)[number];
export type AuthorizationStatus = (typeof AUTHORIZATION_STATUSES)[number];

export const CREDIT_LIMITS = { photographer: 100, publisher: 100, source_url: 500, credit_line: 200 };

// What the form sends.
export interface PhotoCredits {
  photographer: string;
  // Empty for none.
  publisher: string;
  source_url: string;
  licence: Licence;
  authorization_status: AuthorizationStatus;
  credit_line: string;
}

// What the form gets back: the saved credits, and whether the photo was
// replaced after they were saved ("Check these credits").
export interface SavedPhotoCredits extends PhotoCredits {
  photo_changed: boolean;
  updated_at: Date;
}

const text = (value: unknown) => (typeof value === 'string' ? value.trim() : '');
export const bad = (message: string) => new BadRequestException(message);

// Checks the credits with plain sentences (the database checks them all
// again, 054).
export function photoCreditsFrom(body: Record<string, unknown> | undefined): PhotoCredits {
  const photographer = text(body?.photographer);
  const publisher = text(body?.publisher);
  const sourceUrl = text(body?.source_url);
  const licence = body?.licence;
  const status = body?.authorization_status;
  const creditLine = text(body?.credit_line);

  if (!photographer) throw bad("Please enter the photographer's name.");
  if (photographer.length > CREDIT_LIMITS.photographer)
    throw bad(`Please keep the photographer's name to ${CREDIT_LIMITS.photographer} characters.`);
  if (publisher.length > CREDIT_LIMITS.publisher)
    throw bad(`Please keep the publisher or website to ${CREDIT_LIMITS.publisher} characters.`);
  if (sourceUrl && !/^https:\/\/\S+$/.test(sourceUrl))
    throw bad('Please enter the original photo URL starting with https://, or leave it empty.');
  if (sourceUrl.length > CREDIT_LIMITS.source_url)
    throw bad(`Please keep the original photo URL to ${CREDIT_LIMITS.source_url} characters.`);
  if (typeof licence !== 'string' || !(LICENCES as readonly string[]).includes(licence))
    throw bad('Please choose the copyright licence from the list.');
  if (typeof status !== 'string' || !(AUTHORIZATION_STATUSES as readonly string[]).includes(status))
    throw bad('Please choose the authorization status from the list.');
  if (licence === 'all_rights_reserved' && status !== 'owner_permission')
    throw bad(
      'A photo with "All rights reserved" needs "Permission from the owner". Please ask the owner first, or choose another photo.',
    );
  if (!creditLine) throw bad('Please enter the attribution / photo credits line.');
  if (creditLine.length > CREDIT_LIMITS.credit_line)
    throw bad(`Please keep the attribution / photo credits line to ${CREDIT_LIMITS.credit_line} characters.`);

  return {
    photographer,
    publisher,
    source_url: sourceUrl,
    licence: licence as Licence,
    authorization_status: status as AuthorizationStatus,
    credit_line: creditLine,
  };
}

// A place's saved credits, or null without any. photoUrl is the place's
// photo now: if it differs from the one the credits were saved for, the
// photo was replaced after them.
export async function creditsOf(
  runner: QueryRunner,
  type: AdminPlaceType,
  id: string,
  photoUrl: string | null,
): Promise<SavedPhotoCredits | null> {
  const [row]: (PhotoCredits & { for_photo_url: string | null; updated_at: Date })[] = await runner.query(
    `select photographer, publisher, source_url, licence, authorization_status, credit_line,
            for_photo_url, updated_at
       from public.place_photo_credits
      where photo_id = (select id from public.place_photos
                         where place_type = $1 and place_id = $2 and position = 1)`,
    [type, id],
  );
  if (!row) return null;
  const { for_photo_url: forPhotoUrl, ...credits } = row;
  return { ...credits, photo_changed: forPhotoUrl !== photoUrl };
}

// The save itself, inside a transaction that already acts as the admin
// (also used when a new place is added with its credits, ticket 133).
// photoId names one of the place's photos (ticket 144); without it, its
// cover (photo 1). The credits are saved for that photo's address as it is
// now ("Check these credits" when it is replaced). Answers false when the
// place has no such photo. Every value travels as a parameter.
export async function saveCredits(
  runner: QueryRunner,
  type: AdminPlaceType,
  id: string,
  credits: PhotoCredits,
  photoId: string | null = null,
): Promise<boolean> {
  const rows: unknown[] = await runner.query(
    `insert into public.place_photo_credits
       (photo_id, place_type, place_id, photographer, publisher, source_url, licence,
        authorization_status, credit_line, for_photo_url)
     select p.id, $1, $2, $3, $4, $5, $6, $7, $8, p.photo_url
       from public.place_photos p
      where p.place_type = $1 and p.place_id = $2
        and (case when $9::uuid is null then p.position = 1 else p.id = $9::uuid end)
     on conflict (photo_id) do update
       set photographer = excluded.photographer, publisher = excluded.publisher,
           source_url = excluded.source_url, licence = excluded.licence,
           authorization_status = excluded.authorization_status,
           credit_line = excluded.credit_line, for_photo_url = excluded.for_photo_url
     returning photo_id`,
    [
      type,
      id,
      credits.photographer,
      credits.publisher,
      credits.source_url,
      credits.licence,
      credits.authorization_status,
      credits.credit_line,
      photoId,
    ],
  );
  return rows.length > 0;
}

// One photo of a place, as the Edit form shows it (ticket 144): its
// position (1 is the cover), address and credits.
export interface PlacePhotoDto {
  id: string;
  position: number;
  photo_url: string;
  credits: SavedPhotoCredits | null;
}

// Every photo of a place, cover first, each with its credits.
export async function photosOf(runner: QueryRunner, type: AdminPlaceType, id: string): Promise<PlacePhotoDto[]> {
  const rows: (Omit<PlacePhotoDto, 'credits'> &
    Partial<PhotoCredits> & { has_credits: boolean; for_photo_url: string | null; updated_at: Date | null })[] =
    await runner.query(
      `select p.id, p.position, p.photo_url, pc.photo_id is not null as has_credits,
              pc.photographer, pc.publisher, pc.source_url, pc.licence, pc.authorization_status,
              pc.credit_line, pc.for_photo_url, pc.updated_at
         from public.place_photos p
         left join public.place_photo_credits pc on pc.photo_id = p.id
        where p.place_type = $1 and p.place_id = $2
        order by p.position`,
      [type, id],
    );
  return rows.map((row) => ({
    id: row.id,
    position: row.position,
    photo_url: row.photo_url,
    credits: row.has_credits
      ? {
          photographer: row.photographer!,
          publisher: row.publisher!,
          source_url: row.source_url!,
          licence: row.licence!,
          authorization_status: row.authorization_status!,
          credit_line: row.credit_line!,
          updated_at: row.updated_at!,
          photo_changed: row.for_photo_url !== row.photo_url,
        }
      : null,
  }));
}
