import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectDataSource } from '@nestjs/typeorm';
import { DataSource, QueryFailedError, type QueryRunner } from 'typeorm';
import { httpErrorFrom } from '../database-errors';
import { TravelerTransactions } from '../traveler-transactions';

export type AppliesTo = 'destination' | 'accommodation';
export const APPLIES_TO: AppliesTo[] = ['destination', 'accommodation'];

// A destination category or an accommodation kind (supabase/sql/047).
export interface CategoryDto {
  // What a place's category or type column holds, for example "beach".
  id: string;
  // As shown on the site, for example "Beaches".
  name: string;
  applies_to: AppliesTo;
  // Its card's icon and photo on the home page (ticket 142); null for the
  // default (the built-in one's own, or a pin / a bed and its first
  // place's photo).
  icon?: CategoryIcon | null;
  photo_place_id?: string | null;
}

// The icons a category's card can have (supabase/sql/058).
export const CATEGORY_ICONS = [
  'mountain', 'utensils', 'footprints', 'party', 'trees', 'landmark', 'hotel', 'building',
  'waves', 'tent', 'coffee', 'church', 'camera', 'ship', 'palm', 'pin',
] as const;
export type CategoryIcon = (typeof CATEGORY_ICONS)[number];

// What Edit may change (tickets 141, 142); only what was sent.
export interface CategoryChanges {
  name?: string;
  icon?: CategoryIcon | null;
  photo_place_id?: string | null;
}
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// The same, with how many places use it (the dashboard's panel).
export type CategoryWithCount = CategoryDto & { place_count: number };

export const CATEGORY_NAME = { min: 2, max: 30 };

// "Bed & Breakfast" -> "bed_and_breakfast": small letters and digits, with
// "_" between words. Empty when the name has no letter or digit at all.
export const categoryIdFrom = (name: string) =>
  name
    .toLowerCase()
    .replace(/&/g, ' and ')
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 40)
    .replace(/_+$/, '');

// Checks what the form sent, with a plain sentence for the first problem.
export function newCategoryFrom(body: Record<string, unknown> | undefined): CategoryDto {
  const name = typeof body?.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
  const appliesTo = body?.applies_to;
  if (!APPLIES_TO.includes(appliesTo as AppliesTo)) {
    throw new BadRequestException('Please choose destinations or accommodations.');
  }
  if (name.length < CATEGORY_NAME.min || name.length > CATEGORY_NAME.max) {
    throw new BadRequestException(
      `Please write a name of ${CATEGORY_NAME.min} to ${CATEGORY_NAME.max} characters.`,
    );
  }
  const id = categoryIdFrom(name);
  if (!id) throw new BadRequestException('Please use letters or numbers in the name.');
  return { id, name, applies_to: appliesTo as AppliesTo };
}

// What Edit sent (tickets 141, 142): a new name (checked like a new
// one's), an icon from the list, and a place id for the card photo; null
// for the icon or photo means "the default". At least one of them.
export function categoryChangesFrom(body: Record<string, unknown> | undefined): CategoryChanges {
  const changes: CategoryChanges = {};
  if (body?.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim().replace(/\s+/g, ' ') : '';
    if (name.length < CATEGORY_NAME.min || name.length > CATEGORY_NAME.max) {
      throw new BadRequestException(
        `Please write a name of ${CATEGORY_NAME.min} to ${CATEGORY_NAME.max} characters.`,
      );
    }
    changes.name = name;
  }
  if (body?.icon !== undefined) {
    if (body.icon !== null && !(CATEGORY_ICONS as readonly unknown[]).includes(body.icon)) {
      throw new BadRequestException('Please choose an icon from the list.');
    }
    changes.icon = body.icon as CategoryIcon | null;
  }
  if (body?.photo_place_id !== undefined) {
    if (body.photo_place_id !== null && !(typeof body.photo_place_id === 'string' && UUID.test(body.photo_place_id))) {
      throw new BadRequestException("Please choose a photo of one of this category's own places.");
    }
    changes.photo_place_id = body.photo_place_id as string | null;
  }
  if (Object.keys(changes).length === 0) throw new BadRequestException('Nothing to change.');
  return changes;
}

// Categories and kinds (full admin management round, ticket 116). Reading
// goes through the backend's own login, which may read the list and the
// places (016, 047). Adding and deleting run AS the signed-in admin
// (TravelerTransactions), so Row Level Security decides: only admins may
// add or delete, and the database refuses a name used twice and deleting
// one a place still uses.
@Injectable()
export class CategoriesService {
  private readonly logger = new Logger(CategoriesService.name);

  constructor(
    @InjectDataSource() private readonly dataSource: DataSource,
    private readonly travelerTransactions: TravelerTransactions,
  ) {}

  // Every category and kind, A to Z. Anyone may read it.
  async list(): Promise<CategoryDto[]> {
    try {
      return await this.dataSource.query(
        'select id, name, applies_to, icon, photo_place_id from public.place_categories order by name',
      );
    } catch (error) {
      this.logger.error(`Could not read categories: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load the categories right now.');
    }
  }

  // The same, each with how many places use it.
  async listWithCounts(): Promise<CategoryWithCount[]> {
    try {
      return await this.dataSource.query(
        `select c.id, c.name, c.applies_to, c.icon, c.photo_place_id,
                case when c.applies_to = 'destination'
                     then (select count(*)::int from public.destinations d where d.category = c.id)
                     else (select count(*)::int from public.accommodations a where a.type = c.id)
                end as place_count
           from public.place_categories c
          order by c.name`,
      );
    } catch (error) {
      this.logger.error(`Could not read categories: ${String(error)}`);
      throw new ServiceUnavailableException('Could not load the categories right now.');
    }
  }

  private asAdmin<T>(accessToken: string, work: (runner: QueryRunner) => Promise<T>): Promise<T> {
    return this.travelerTransactions.run(accessToken, work, (error) => this.toHttpError(error));
  }

  // Adds a category or kind and answers with it.
  add(accessToken: string, category: CategoryDto): Promise<CategoryWithCount> {
    return this.asAdmin(accessToken, async (runner) => {
      await runner.query(
        'insert into public.place_categories (id, name, applies_to) values ($1, $2, $3)',
        [category.id, category.name, category.applies_to],
      );
      return { ...category, place_count: 0 };
    });
  }

  // Edit (tickets 141, 142): its name, icon and card photo; its id, which
  // places point at, stays. As the admin, so the database decides (057,
  // 058): only admins, 2 to 30 characters, not a name already used, an
  // icon from the list, a photo of one of its own places. Only what was
  // sent changes ("coalesce" keeps the rest; $5 / $6 say whether the icon
  // or photo was sent, since null there means "back to the default").
  // Answers it with how many places use it.
  update(accessToken: string, id: string, changes: CategoryChanges): Promise<CategoryWithCount> {
    return this.asAdmin(accessToken, async (runner) => {
      const [rows]: [CategoryDto[], number] = await runner.query(
        `update public.place_categories
            set name = coalesce($2, name),
                icon = case when $5 then $3 else icon end,
                photo_place_id = case when $6 then $4::uuid else photo_place_id end
          where id = $1
          returning id, name, applies_to, icon, photo_place_id`,
        [
          id,
          changes.name ?? null,
          changes.icon ?? null,
          changes.photo_place_id ?? null,
          'icon' in changes,
          'photo_place_id' in changes,
        ],
      );
      if (rows.length === 0) throw new NotFoundException("We couldn't find that category.");
      const [{ n }]: { n: number }[] = await runner.query(
        `select ((select count(*) from public.destinations where category = $1)
               + (select count(*) from public.accommodations where type = $1))::int as n`,
        [id],
      );
      return { ...rows[0], place_count: n };
    });
  }

  // Deletes one that no place uses.
  remove(accessToken: string, id: string): Promise<{ id: string; message: string }> {
    return this.asAdmin(accessToken, async (runner) => {
      const [rows]: [{ name: string }[], number] = await runner.query(
        'delete from public.place_categories where id = $1 returning name',
        [id],
      );
      if (rows.length === 0) throw new NotFoundException("We couldn't find that category.");
      return { id, message: `"${rows[0].name}" was deleted.` };
    });
  }

  private toHttpError(error: unknown) {
    // The card photo's own check (058) has its own sentence.
    const message = error instanceof QueryFailedError ? String(error.message) : '';
    if (message.includes("own places")) {
      return new BadRequestException("Please choose a photo of one of this category's own places.");
    }
    if (message.includes('icon_check')) return new BadRequestException('Please choose an icon from the list.');
    return httpErrorFrom(error, this.logger, 'save a category', {
      // The same name, or a name that makes the same id.
      '23505': () => new ConflictException('That name is already used.'),
      // A place still uses it (the delete guard in 047).
      '23503': () => new ConflictException('Some places still use it.'),
      // A name outside 2 to 30 characters.
      '23514': () =>
        new BadRequestException(
          `Please write a name of ${CATEGORY_NAME.min} to ${CATEGORY_NAME.max} characters.`,
        ),
    });
  }
}
