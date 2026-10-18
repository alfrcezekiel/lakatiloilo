-- Fix: "Table public.spatial_ref_sys is public, but RLS has not been enabled"
--
-- Enabling PostGIS in the public schema (008) created the table
-- public.spatial_ref_sys. Everything in public is reachable through the
-- Supabase API, and this table had no RLS: anyone with the publishable key
-- could insert, update, delete or truncate it, which would break every
-- spatial query.
--
-- We cannot simply turn RLS on: the table is owned by supabase_admin, so
-- `alter table ... enable row level security` fails with
-- "must be owner of table spatial_ref_sys". Supabase's recommended fix is
-- to install PostGIS in the `extensions` schema instead, which the API does
-- not expose. PostGIS cannot be moved in place, so we drop and recreate it.
--
-- Dropping PostGIS also drops the two `location` columns, because their
-- geography type comes from PostGIS. No data is lost: every row still has
-- latitude and longitude, and we rebuild `location` from them below.
--
-- The backend needs no code change: the postgres role's search_path is
-- "$user", public, extensions, so ST_DWithin etc. are still found.
--
-- Run the whole file at once in the Supabase SQL editor. It is one
-- transaction, so if any step fails nothing changes.

begin;

drop extension if exists postgis cascade;

create extension postgis with schema extensions;

alter table destinations
add column location extensions.geography(POINT, 4326);

alter table accommodations
add column location extensions.geography(POINT, 4326);

update destinations
set location = extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
where latitude is not null and longitude is not null;

update accommodations
set location = extensions.st_setsrid(extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
where latitude is not null and longitude is not null;

commit;

-- Check: this should return no rows (the table has left the public schema).
select tablename from pg_tables
where schemaname = 'public' and tablename = 'spatial_ref_sys';
