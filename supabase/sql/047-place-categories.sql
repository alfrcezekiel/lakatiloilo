-- Categories and kinds the team can add (full admin management round,
-- ticket 116).
--
-- Until now the destination categories (mountain, food, ...) and the
-- accommodation kinds (hotel, condominium) were a fixed list in the
-- website's code. This adds a place_categories table that holds them, so
-- the team can add a new one from the dashboard:
--   - id:         a short word made from the name ("beach",
--                 "bed_and_breakfast"); it is what a place's category or
--                 type column holds
--   - name:       as shown on the site, 2 to 30 characters, never used twice
--   - applies_to: "destination" (a category) or "accommodation" (a kind)
-- It starts with the eight in use today, with the names the site shows.
--
-- Who may do what (Row Level Security, with explicit policies):
--   - anyone may read (the home page and the place form need the list),
--   - only admins (038) may add one and delete one,
--   - nobody may edit one (renaming is not part of this round).
--
-- Two guards keep places and the list in step:
--   - a category or kind that a place still uses cannot be deleted,
--   - a place cannot be saved with a category or kind that is not in the
--     list, or is of the other sort.
--
-- On the Realtime list, so an open home page notices a new one (the
-- website only uses it as a doorbell, then asks the backend again).
--
-- Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ----------------------------------------------------------

create table if not exists public.place_categories (
    id text primary key check (id ~ '^[a-z0-9]+(_[a-z0-9]+)*$' and char_length(id) <= 40),
    name text not null check (char_length(btrim(name)) between 2 and 30),
    applies_to text not null check (applies_to in ('destination', 'accommodation')),
    created_at timestamptz not null default now()
);

-- A name is used once, whatever its capitals ("Beaches" and "beaches").
create unique index if not exists place_categories_name_once
    on public.place_categories (lower(btrim(name)));

-- 2. The eight in use today ------------------------------------------------

insert into public.place_categories (id, name, applies_to) values
    ('mountain', 'Mountains', 'destination'),
    ('food', 'Food', 'destination'),
    ('festival', 'Festivals', 'destination'),
    ('walking', 'Walking Areas', 'destination'),
    ('nature', 'Nature & Parks', 'destination'),
    ('heritage', 'Heritage Sites', 'destination'),
    ('hotel', 'Hotels', 'accommodation'),
    ('condominium', 'Condominiums', 'accommodation')
on conflict (id) do nothing;

-- 3. What website users and the backend may touch at all -------------------

revoke all on public.place_categories from anon, authenticated;

grant select on public.place_categories to anon, authenticated, lakat_api;
-- Only these three; the date is set for them.
grant insert (id, name, applies_to) on public.place_categories to authenticated;
grant delete on public.place_categories to authenticated;

-- 4. Row Level Security -----------------------------------------------------

alter table public.place_categories enable row level security;

drop policy if exists "anyone can read categories" on public.place_categories;
drop policy if exists "api can read categories" on public.place_categories;
drop policy if exists "admins can add categories" on public.place_categories;
drop policy if exists "admins can delete categories" on public.place_categories;

create policy "anyone can read categories" on public.place_categories for
select to anon, authenticated using (true);

create policy "api can read categories" on public.place_categories for
select to lakat_api using (true);

create policy "admins can add categories" on public.place_categories for
insert to authenticated with check ((select public.is_admin ()));

create policy "admins can delete categories" on public.place_categories for
delete to authenticated using ((select public.is_admin ()));

-- 5. A category in use cannot be deleted -------------------------------------

create or replace function public.place_categories_before_delete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if exists (select 1 from public.destinations d where d.category = old.id)
     or exists (select 1 from public.accommodations a where a.type = old.id) then
    raise exception 'Some places still use it.' using errcode = '23503';
  end if;
  return old;
end;
$$;

revoke all on function public.place_categories_before_delete() from public, anon, authenticated;

drop trigger if exists place_categories_before_delete on public.place_categories;

create trigger place_categories_before_delete
  before delete on public.place_categories
  for each row execute function public.place_categories_before_delete();

-- 6. A place's category or kind must be in the list ----------------------------
--
-- One function for both tables: destinations keep it in "category",
-- accommodations in "type". It runs when a place is added or its category
-- or kind changes.

create or replace function public.place_category_must_exist()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  wanted text;
  sort text;
begin
  if tg_table_name = 'destinations' then
    wanted := new.category;
    sort := 'destination';
  else
    wanted := new.type;
    sort := 'accommodation';
  end if;

  if not exists (
    select 1 from public.place_categories c
     where c.id = wanted and c.applies_to = sort
  ) then
    raise exception 'That category or kind is not in the list.' using errcode = '23503';
  end if;
  return new;
end;
$$;

revoke all on function public.place_category_must_exist() from public, anon, authenticated;

drop trigger if exists destination_category_must_exist on public.destinations;

create trigger destination_category_must_exist
  before insert or update of category on public.destinations
  for each row execute function public.place_category_must_exist();

drop trigger if exists accommodation_kind_must_exist on public.accommodations;

create trigger accommodation_kind_must_exist
  before insert or update of type on public.accommodations
  for each row execute function public.place_category_must_exist();

-- 7. Live updates ---------------------------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public'
       and tablename = 'place_categories'
  ) then
    alter publication supabase_realtime add table public.place_categories;
  end if;
end;
$$;

-- 8. Check it worked --------------------------------------------------------------
--
-- Should list the eight, six for destinations and two for accommodations:
--   select id, name, applies_to from public.place_categories order by applies_to desc, name;
--
-- Should be 0 (every place's category or kind is in the list):
--   select (select count(*) from public.destinations d
--            where not exists (select 1 from public.place_categories c
--                               where c.id = d.category and c.applies_to = 'destination'))
--        + (select count(*) from public.accommodations a
--            where not exists (select 1 from public.place_categories c
--                               where c.id = a.type and c.applies_to = 'accommodation')) as missing;
--
-- Should list the four policies above:
--   select policyname, cmd, roles from pg_policies where tablename = 'place_categories';
