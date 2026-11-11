-- Admins may change every field of a place (full admin management round,
-- ticket 118).
--
-- 043 let admins change a place's name, description and address (and an
-- accommodation's phone and email). This adds:
--   - destinations:   category, location_type, latitude, longitude
--   - accommodations: type (its kind), location_type, latitude, longitude
-- The photo comes in ticket 119; adding and deleting places in 120 and 121.
--
-- The database checks the new values itself:
--   - the category or kind must be in place_categories (the guard from 047),
--   - location_type is iloilo_city or iloilo_province (existing checks),
--   - the latitude and longitude must be inside Iloilo:
--       latitude 10.4 to 11.7, longitude 121.8 to 123.3
--     (every current place fits: 10.61 to 11.12 and 122.13 to 122.63),
--   - a trigger keeps the map position ("location", used by the nearby
--     search) in step with the latitude and longitude, so they can never
--     disagree.
--
-- Row Level Security is unchanged: the "admins can edit ..." policies from
-- 043 already limit every update to admins. Travelers still cannot write.
-- Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The extra columns admins may change -----------------------------------

grant update (category, location_type, latitude, longitude) on public.destinations to authenticated;
grant update (type, location_type, latitude, longitude) on public.accommodations to authenticated;

-- 2. Inside Iloilo -----------------------------------------------------------

alter table public.destinations drop constraint if exists destinations_inside_iloilo;
alter table public.destinations add constraint destinations_inside_iloilo check (
    latitude is not null and longitude is not null
    and latitude between 10.4 and 11.7
    and longitude between 121.8 and 123.3
);

alter table public.accommodations drop constraint if exists accommodations_inside_iloilo;
alter table public.accommodations add constraint accommodations_inside_iloilo check (
    latitude is not null and longitude is not null
    and latitude between 10.4 and 11.7
    and longitude between 121.8 and 123.3
);

-- 3. The map position follows the latitude and longitude --------------------
--
-- One function for both tables. It runs when a place is added or its
-- latitude or longitude changes. PostGIS lives in the "extensions" schema
-- (012), so its names are written in full.

create or replace function public.place_location_from_coordinates()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  new.location := extensions.st_setsrid(
    extensions.st_makepoint(new.longitude::double precision, new.latitude::double precision),
    4326
  )::extensions.geography;
  return new;
end;
$$;

revoke all on function public.place_location_from_coordinates() from public, anon, authenticated;

drop trigger if exists destination_location_from_coordinates on public.destinations;

create trigger destination_location_from_coordinates
  before insert or update of latitude, longitude on public.destinations
  for each row execute function public.place_location_from_coordinates();

drop trigger if exists accommodation_location_from_coordinates on public.accommodations;

create trigger accommodation_location_from_coordinates
  before insert or update of latitude, longitude on public.accommodations
  for each row execute function public.place_location_from_coordinates();

-- 4. Check it worked ----------------------------------------------------------
--
-- Should be true, true, false (category and latitude may be changed; the
-- photo not yet):
--   select has_column_privilege('authenticated', 'public.destinations', 'category', 'UPDATE'),
--          has_column_privilege('authenticated', 'public.destinations', 'latitude', 'UPDATE'),
--          has_column_privilege('authenticated', 'public.destinations', 'photo_url', 'UPDATE');
--
-- Should list both new triggers:
--   select tgrelid::regclass, tgname from pg_trigger
--    where tgname like '%location_from_coordinates';
