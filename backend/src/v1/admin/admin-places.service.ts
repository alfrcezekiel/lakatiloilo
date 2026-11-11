import { randomUUID } from 'crypto';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { QueryFailedError, type QueryRunner } from 'typeorm';
import { httpErrorFrom } from '../database-errors';
import { TravelerTransactions } from '../traveler-transactions';
import { ReviewPhotosService, type UploadedPhoto } from '../reviews/review-photos.service';
import { PlacePhotosService } from './place-photos.service';
import { creditsOf, saveCredits, type PhotoCredits, type SavedPhotoCredits } from './photo-credits';

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

// The same limits as the database (043), with plain messages.
export const PLACE_LIMITS = { name: 100, address: 200, description: 1000, phone: 40, email: 120 };

const placeNotFound = () => new NotFoundException("We couldn't find that place.");

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

// The Places screen (admin dashboard & moderation round, ticket 112): the
// team lists every place and corrects its name, description and address
// (and an accommodation's phone and email). Everything runs AS the
// signed-in admin (TravelerTransactions), so the database decides: 043
// lets admins change only those columns, and nobody may add or delete a
// place. Admin-only routes check is_admin() first as well.
@Injectable()
export class AdminPlacesService {
  private readonly logger = new Logger(AdminPlacesService.name);

  constructor(
    private readonly travelerTransactions: TravelerTransactions,
    private readonly placePhotos: PlacePhotosService,
    private readonly reviewPhotos: ReviewPhotosService,
  ) {}

  private asAdmin<T>(accessToken: string, work: (runner: QueryRunner) => Promise<T>): Promise<T> {
    return this.travelerTransactions.run(accessToken, work, (error) => this.toHttpError(error));
  }

  // Every destination and accommodation, A to Z.
  list(accessToken: string): Promise<AdminPlaceRow[]> {
    return this.asAdmin(accessToken, (runner) =>
      runner.query(
        `with counts as (
           select place_type, place_id, count(*)::int as n,
                  round(avg(rating) filter (where hidden_at is null), 2)::float8 as average_rating
             from public.reviews group by 1, 2
         )
         select d.id, 'destination' as type, d.name, d.category as kind, d.address, d.location_type,
                coalesce(c.n, 0) as review_count, d.created_at, c.average_rating,
                coalesce(pc.authorization_status = 'not_checked', true) as credit_missing
           from public.destinations d
           left join counts c on c.place_type = 'destination' and c.place_id = d.id
           left join public.place_photo_credits pc on pc.place_type = 'destination' and pc.place_id = d.id
         union all
         select a.id, 'accommodation' as type, a.name, a.type as kind, a.address, a.location_type,
                coalesce(c.n, 0) as review_count, a.created_at, c.average_rating,
                coalesce(pc.authorization_status = 'not_checked', true) as credit_missing
           from public.accommodations a
           left join counts c on c.place_type = 'accommodation' and c.place_id = a.id
           left join public.place_photo_credits pc on pc.place_type = 'accommodation' and pc.place_id = a.id
         order by name`,
      ) as Promise<AdminPlaceRow[]>,
    );
  }

  // One place with the fields the Edit form changes.
  async findOne(accessToken: string, type: AdminPlaceType, id: string): Promise<AdminPlaceDetails> {
    const place = await this.asAdmin(accessToken, async (runner) => {
      const [row]: Omit<AdminPlaceDetails, 'credits'>[] = await runner.query(
        type === 'destination'
          ? `select id, 'destination' as type, name, coalesce(description, '') as description, address,
                    null as phone, null as email, category as kind, location_type,
                    latitude::float8 as latitude, longitude::float8 as longitude, photo_url, updated_at
               from public.destinations where id = $1`
          : `select id, 'accommodation' as type, name, coalesce(description, '') as description, address,
                    phone, email, type as kind, location_type,
                    latitude::float8 as latitude, longitude::float8 as longitude, photo_url, updated_at
               from public.accommodations where id = $1`,
        [id],
      );
      if (!row) return null;
      return { ...row, credits: await creditsOf(runner, type, id, row.photo_url) };
    });
    if (!place) throw placeNotFound();
    return place;
  }

  // Saves the team's changes and answers with the saved place. Values
  // travel as parameters, never inside the SQL text; which table is
  // chosen from the checked type, never taken from the request as text.
  async update(
    accessToken: string,
    type: AdminPlaceType,
    id: string,
    changes: PlaceChanges,
  ): Promise<AdminPlaceDetails> {
    const updated = await this.asAdmin(accessToken, async (runner) => {
      const [rows]: [unknown[], number] = await runner.query(
        type === 'destination'
          ? `update public.destinations
                set name = $2, description = $3, address = $4,
                    category = $5, location_type = $6, latitude = $7, longitude = $8
              where id = $1 returning id`
          : `update public.accommodations
                set name = $2, description = $3, address = $4,
                    type = $5, location_type = $6, latitude = $7, longitude = $8,
                    phone = $9, email = $10
              where id = $1 returning id`,
        [
          id,
          changes.name,
          changes.description,
          changes.address,
          changes.kind,
          changes.location_type,
          changes.latitude,
          changes.longitude,
          ...(type === 'destination' ? [] : [changes.phone, changes.email]),
        ],
      );
      return rows.length;
    });
    if (updated === 0) throw placeNotFound();
    return this.findOne(accessToken, type, id);
  }

  // Replaces the place's photo with a file from the admin's computer
  // (ticket 119), and answers with the saved place:
  //   1. the file is checked (type from its first bytes, size) and the
  //      place must exist,
  //   2. it is uploaded into the place-photos bucket,
  //   3. the place's photo_url is set to its public address; if that
  //      fails, the new file is deleted again,
  //   4. the old photo is deleted from Storage if it was an uploaded one
  //      (older Wikimedia and Unsplash addresses are left alone).
  async replacePhoto(
    accessToken: string,
    type: AdminPlaceType,
    id: string,
    photo: UploadedPhoto,
  ): Promise<AdminPlaceDetails> {
    this.placePhotos.check(photo);
    const before = await this.findOne(accessToken, type, id);
    const url = await this.placePhotos.upload(accessToken, type, id, photo);
    try {
      const saved = await this.asAdmin(accessToken, async (runner) => {
        const [rows]: [unknown[], number] = await runner.query(
          type === 'destination'
            ? 'update public.destinations set photo_url = $2 where id = $1 returning id'
            : 'update public.accommodations set photo_url = $2 where id = $1 returning id',
          [id, url],
        );
        return rows.length;
      });
      if (saved === 0) throw placeNotFound();
    } catch (error) {
      await this.placePhotos.remove(accessToken, url);
      throw error;
    }
    if (before.photo_url !== url) await this.placePhotos.remove(accessToken, before.photo_url);
    return this.findOne(accessToken, type, id);
  }

  // Adds a new place with its photo (ticket 120), and answers with it:
  //   1. the file is checked (type from its first bytes, size),
  //   2. the backend chooses the new place's id and uploads the photo into
  //      that place's folder,
  //   3. the place is added with the photo's address in one step (050
  //      refuses a new place without a photo or description), and its
  //      photo credits in the same transaction (ticket 133); if either
  //      fails, neither is kept and the photo is deleted again, so
  //      nothing is left behind.
  async create(
    accessToken: string,
    type: AdminPlaceType,
    place: PlaceChanges,
    photo: UploadedPhoto,
    credits: PhotoCredits,
  ): Promise<AdminPlaceDetails> {
    this.placePhotos.check(photo);
    const id = randomUUID();
    const url = await this.placePhotos.upload(accessToken, type, id, photo);
    try {
      await this.asAdmin(accessToken, async (runner) => {
        await runner.query(
          type === 'destination'
            ? `insert into public.destinations
                 (id, name, description, address, category, location_type, latitude, longitude, photo_url)
               values ($1, $2, $3, $4, $5, $6, $7, $8, $9)`
            : `insert into public.accommodations
                 (id, name, description, address, type, location_type, latitude, longitude, photo_url,
                  phone, email)
               values ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
          [
            id,
            place.name,
            place.description,
            place.address,
            place.kind,
            place.location_type,
            place.latitude,
            place.longitude,
            url,
            ...(type === 'destination' ? [] : [place.phone, place.email]),
          ],
        );
        await saveCredits(runner, type, id, credits);
      });
    } catch (error) {
      await this.placePhotos.remove(accessToken, url);
      throw error;
    }
    return this.findOne(accessToken, type, id);
  }

  // Deletes a place for good (ticket 121), and answers { id, message }:
  //   1. in one transaction: the place's photo address and its reviews'
  //      photo files are noted, then the place is deleted; the database
  //      deletes its reviews with it (051), and each review its replies,
  //      likes, reports, photo rows and notifications,
  //   2. then the files are deleted from Storage, as the admin: the
  //      place's uploaded photo (older Wikimedia and Unsplash addresses
  //      are left alone) and every photo of its reviews. A file that
  //      cannot be deleted is only logged; the place is already gone.
  async remove(
    accessToken: string,
    type: AdminPlaceType,
    id: string,
  ): Promise<{ id: string; message: string }> {
    const found = await this.asAdmin(accessToken, async (runner) => {
      const [place]: { photo_url: string | null }[] = await runner.query(
        type === 'destination'
          ? 'select photo_url from public.destinations where id = $1'
          : 'select photo_url from public.accommodations where id = $1',
        [id],
      );
      if (!place) return null;
      const photos: { photo_path: string }[] = await runner.query(
        `select p.photo_path from public.review_photos p
           join public.reviews r on r.id = p.review_id
          where r.place_type = $1 and r.place_id = $2`,
        [type, id],
      );
      const [rows]: [unknown[], number] = await runner.query(
        type === 'destination'
          ? 'delete from public.destinations where id = $1 returning id'
          : 'delete from public.accommodations where id = $1 returning id',
        [id],
      );
      if (rows.length === 0) return null;
      return { photoUrl: place.photo_url, reviewPhotoPaths: photos.map((photo) => photo.photo_path) };
    });
    if (!found) throw placeNotFound();
    await Promise.all([
      this.placePhotos.remove(accessToken, found.photoUrl),
      ...found.reviewPhotoPaths.map((path) => this.reviewPhotos.remove(accessToken, path)),
    ]);
    return { id, message: 'Deleted, with its reviews and photos.' };
  }

  private toHttpError(error: unknown) {
    // The new place's photo credits refused by the database (054, ticket
    // 133); the backend checks them first, so this is rare.
    if (
      error instanceof QueryFailedError &&
      (error.driverError as { table?: string } | undefined)?.table === 'place_photo_credits'
    ) {
      return new BadRequestException('Please check the photo credits and try again.');
    }
    return httpErrorFrom(error, this.logger, 'read or save a place', {
      // A length, or a position outside Iloilo, that the database refused
      // (043, 048), or a new place without a photo or description (050).
      '23514': () =>
        new BadRequestException(
          'Please keep each field within its length, and the position inside Iloilo, then try again.',
        ),
      // A category or kind that is not in the list (047).
      '23503': () => new BadRequestException('Please choose a category or kind from the list.'),
    });
  }
}
