-- Check 07 — the roles the app uses cannot skip Row Level Security.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: the backend logs in as lakat_api (supabase/sql/016) and switches to
-- "authenticated" for each traveler's write, so RLS decides. If any of
-- these roles could bypass RLS, every policy would be ignored.
--
-- EXPECTED: three rows, and every true/false column says false.

select rolname as role,
       rolsuper as is_superuser,
       rolbypassrls as skips_rls,
       rolcreaterole as can_make_roles,
       rolcreatedb as can_make_databases
from pg_roles
where rolname in ('lakat_api', 'anon', 'authenticated')
order by rolname;
