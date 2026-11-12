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
       from public.place_photo_credits where place_type = $1 and place_id = $2`,
    [type, id],
  );
  if (!row) return null;
  const { for_photo_url: forPhotoUrl, ...credits } = row;
  return { ...credits, photo_changed: forPhotoUrl !== photoUrl };
}

// The save itself, inside a transaction that already acts as the admin
// (also used when a new place is added with its credits, ticket 133).
// Which table the photo is read from is chosen from the checked type,
// never taken from the request as text.
export async function saveCredits(
  runner: QueryRunner,
  type: AdminPlaceType,
  id: string,
  credits: PhotoCredits,
): Promise<void> {
  const photoOf =
    type === 'destination'
      ? '(select photo_url from public.destinations where id = $2)'
      : '(select photo_url from public.accommodations where id = $2)';
  await runner.query(
    `insert into public.place_photo_credits
       (place_type, place_id, photographer, publisher, source_url, licence,
        authorization_status, credit_line, for_photo_url)
     values ($1, $2, $3, $4, $5, $6, $7, $8, ${photoOf})
     on conflict (place_type, place_id) do update
       set photographer = excluded.photographer, publisher = excluded.publisher,
           source_url = excluded.source_url, licence = excluded.licence,
           authorization_status = excluded.authorization_status,
           credit_line = excluded.credit_line, for_photo_url = excluded.for_photo_url`,
    [
      type,
      id,
      credits.photographer,
      credits.publisher,
      credits.source_url,
      credits.licence,
      credits.authorization_status,
      credits.credit_line,
    ],
  );
}
