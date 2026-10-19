-- Fix: the backend's read-only login (lakat_api, from 016) could not find
-- PostGIS, so /v1/destinations and /v1/accommodations returned 500.
--
-- Since 012, PostGIS lives in the `extensions` schema. The postgres login
-- has "$user", public, extensions as its search path (the list of schemas
-- Postgres looks in for names like ST_DWithin and the geography type), but
-- a new login only gets "$user", public. So every query that touched the
-- `location` column failed with errors like:
--   function st_asgeojson(extensions.geography) does not exist
--   type "geography" does not exist
--
-- This gives lakat_api the same search path as postgres. It takes effect on
-- new connections; redeploy the backend (or wait for Vercel to recycle it).
--
-- Safe to run more than once.

alter role lakat_api set search_path = "$user", public, extensions;

-- Saved role settings only apply to connections opened from now on. The
-- Supabase pooler keeps database connections open and shares them, so close
-- the existing lakat_api ones; the pooler reopens them with the new setting.
-- (A request in flight at that moment may fail once.)
select pg_terminate_backend(pid)
from pg_stat_activity
where usename = 'lakat_api';

-- Check: should show search_path="$user", public, extensions
select rolname, rolconfig from pg_roles where rolname = 'lakat_api';
