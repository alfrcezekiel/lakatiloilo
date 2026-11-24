-- Restores two permissions of the backend's lakat_api login.
--
-- Why: the baseline migration was pulled from production, and that pull left
-- out these two grants (first made in supabase/sql/016 and 023). A database
-- built from the migrations alone, like staging, therefore failed:
--   1. Without USAGE on the extensions schema, the backend cannot find PostGIS
--      functions, so GET /v1/destinations and /v1/accommodations answered 500.
--   2. Without membership of authenticated, the backend cannot act as a
--      logged-in traveler, so Row Level Security could not check their writes.
--
-- Safe to run where the grants already exist, such as production: it changes
-- nothing there. lakat_api is NOINHERIT, so it gets no traveler rights until a
-- request explicitly switches role inside a transaction.

grant usage on schema extensions to lakat_api;

grant authenticated to lakat_api;

-- Checks (read-only):
-- select has_schema_privilege('lakat_api', 'extensions', 'USAGE');   -- true
-- select pg_has_role('lakat_api', 'authenticated', 'MEMBER');        -- true
-- select pg_has_role('lakat_api', 'authenticated', 'USAGE');         -- false
