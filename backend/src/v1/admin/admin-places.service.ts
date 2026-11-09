import {
  BadRequestException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { QueryFailedError, type QueryRunner } from 'typeorm';
import { TravelerTransactions } from '../traveler-transactions';

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
  photo_url: string | null;
  updated_at: Date;
}

// What the team may change (the columns supabase/sql/043 allows).
export interface PlaceChanges {
  name: string;
  description: string;
  address: string;
  phone: string | null;
  email: string | null;
}

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
  if (type === 'destination') return { name, description, address, phone: null, email: null };

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
  return { name, description, address, phone: phone || null, email: email || null };
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

  constructor(private readonly travelerTransactions: TravelerTransactions) { }

  private asAdmin<T>(accessToken: string, work: (runner: QueryRunner) => Promise<T>): Promise<T> {
    return this.travelerTransactions.run(accessToken, work, (error) => this.toHttpError(error));
  }

  // Every destination and accommodation, A to Z.
  list(accessToken: string): Promise<AdminPlaceRow[]> {
    return this.asAdmin(accessToken, (runner) =>
      runner.query(
        `select id, 'destination' as type, name, category as kind, address, location_type
           from public.destinations
         union all
         select id, 'accommodation' as type, name, type as kind, address, location_type
           from public.accommodations
         order by name`,
      ) as Promise<AdminPlaceRow[]>,
    );
  }

  // One place with the fields the Edit form changes.
  async findOne(accessToken: string, type: AdminPlaceType, id: string): Promise<AdminPlaceDetails> {
    const place = await this.asAdmin(accessToken, async (runner) => {
      const [row]: AdminPlaceDetails[] = await runner.query(
        type === 'destination'
          ? `select id, 'destination' as type, name, coalesce(description, '') as description, address,
                    null as phone, null as email, category as kind, photo_url, updated_at
               from public.destinations where id = $1`
          : `select id, 'accommodation' as type, name, coalesce(description, '') as description, address,
                    phone, email, type as kind, photo_url, updated_at
               from public.accommodations where id = $1`,
        [id],
      );
      return row;
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
          ? `update public.destinations set name = $2, description = $3, address = $4
              where id = $1 returning id`
          : `update public.accommodations
                set name = $2, description = $3, address = $4, phone = $5, email = $6
              where id = $1 returning id`,
        type === 'destination'
          ? [id, changes.name, changes.description, changes.address]
          : [id, changes.name, changes.description, changes.address, changes.phone, changes.email],
      );
      return rows.length;
    });
    if (updated === 0) throw placeNotFound();
    return this.findOne(accessToken, type, id);
  }

  private toHttpError(error: unknown) {
    if (error instanceof HttpException) return error;
    const code =
      error instanceof QueryFailedError
        ? (error.driverError as { code?: string } | undefined)?.code
        : undefined;
    // A length the database refused (043).
    if (code === '23514') {
      return new BadRequestException('Please keep each field within its length and try again.');
    }
    // Refused by the table's permissions or Row Level Security.
    if (code === '42501') return new ForbiddenException('This page is for the Lakat Iloilo team.');
    this.logger.error(`Could not read or save a place: ${String(error)}`);
    return new ServiceUnavailableException('Something went wrong. Please try again.');
  }
}
