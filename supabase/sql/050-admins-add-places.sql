-- Admins may add places (full admin management round, ticket 120).
--
-- Until now places were only added with SQL by the team. From now on an
-- admin adds a destination or an accommodation from the dashboard's
-- "Add a place" form, with every field and a photo uploaded from their
-- computer (place-photos bucket, 049).
--
-- The backend chooses the new place's id itself, uploads the photo into
-- that place's folder first, and then adds the place with the photo's
-- address in one step, so a place never appears on the site without its
-- photo. That is why "id" may be sent too.
--
-- Everything the database already checks applies to new places as well:
-- name, address and description lengths (043), the category or kind from
-- place_categories (047), Iloilo City or Province, a position inside
-- Iloilo, the map position kept in step (048), and an https:// photo
-- address (049). This file adds one more rule: a new place must have a
-- photo.
--
-- Who may do what: only admins may add places (a new Row Level Security
-- policy that asks is_admin()); travelers still cannot. Deleting places
-- comes in ticket 121. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The columns an admin may fill in ----------------------------------------

grant insert (id, name, description, address, category, location_type, latitude, longitude, photo_url)
    on public.destinations to authenticated;

grant insert (id, name, description, address, type, location_type, latitude, longitude, photo_url, phone, email)
    on public.accommodations to authenticated;

-- 2. Row Level Security: only admins may add a place -------------------------

drop policy if exists "admins can add destinations" on public.destinations;

create policy "admins can add destinations" on public.destinations for
insert to authenticated with check ((select public.is_admin ()));

drop policy if exists "admins can add accommodations" on public.accommodations;

create policy "admins can add accommodations" on public.accommodations for
insert to authenticated with check ((select public.is_admin ()));

-- 3. A new place needs a photo and a description -------------------------------
--
-- Checked only when a place is added, so older places are not affected.

create or replace function public.new_place_must_be_complete()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.photo_url is null then
    raise exception 'A new place needs a photo.' using errcode = '23514';
  end if;
  if new.description is null or btrim(new.description) = '' then
    raise exception 'A new place needs a description.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.new_place_must_be_complete() from public, anon, authenticated;

drop trigger if exists new_destination_must_be_complete on public.destinations;

create trigger new_destination_must_be_complete
  before insert on public.destinations
  for each row execute function public.new_place_must_be_complete();

drop trigger if exists new_accommodation_must_be_complete on public.accommodations;

create trigger new_accommodation_must_be_complete
  before insert on public.accommodations
  for each row execute function public.new_place_must_be_complete();

-- 4. Check it worked ------------------------------------------------------------
--
-- Should list the new INSERT policy next to the read and edit policies:
--   select tablename, policyname, cmd from pg_policies
--    where tablename in ('destinations', 'accommodations') order by 1, 3;
--
-- Should be true, false (an admin may fill in the name; nobody may set the
-- creation date):
--   select has_column_privilege('authenticated', 'public.destinations', 'name', 'INSERT'),
--          has_column_privilege('authenticated', 'public.destinations', 'created_at', 'INSERT');
