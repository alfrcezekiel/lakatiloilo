-- A read-only database login for the NestJS backend.
--
-- Until now the backend logged in as `postgres`, which skips Row Level
-- Security and can change or delete anything. If that password ever leaked,
-- so would the whole database. The backend only ever reads two tables, so it
-- gets its own login that can do exactly that and nothing else.
--
-- BEFORE RUNNING: replace CHANGE_ME_STRONG_PASSWORD below with a long random
-- password (e.g. from a password manager). Do that in the Supabase SQL
-- editor only — never save the real password in this file or commit it.
--
-- AFTER RUNNING: change DATABASE_URL (backend/.env and the backend's Vercel
-- Environment Variables) to use this login. With the Supabase pooler the
-- user name is the role name plus your project ref:
--   postgresql://lakat_api.<project-ref>:<password>@<pooler-host>:6543/postgres
-- Then redeploy the backend.

create role lakat_api with login password 'CHANGE_ME_STRONG_PASSWORD';

-- Allowed to see the schemas: public (our tables) and extensions (PostGIS).
grant usage on schema public to lakat_api;
grant usage on schema extensions to lakat_api;

-- Look in `extensions` for PostGIS names (ST_DWithin, geography), like the
-- postgres login does. (Added later; databases built before this line need
-- 018.)
alter role lakat_api set search_path = "$user", public, extensions;

-- Allowed to read the two tables, nothing more: no insert, update, delete.
grant select on public.destinations, public.accommodations to lakat_api;

-- RLS still applies to this login (unlike postgres), so it needs its own
-- read policy, the same as the public one.
create policy "api can read destinations"
  on public.destinations for select
  to lakat_api
  using (true);

create policy "api can read accommodations"
  on public.accommodations for select
  to lakat_api
  using (true);

-- Check: should show lakat_api can log in, is not a superuser, and does
-- not bypass RLS.
select rolname, rolcanlogin, rolsuper, rolbypassrls
from pg_roles where rolname = 'lakat_api';
