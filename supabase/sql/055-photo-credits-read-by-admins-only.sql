-- Only admins and the backend read the photo credits table (photo credits
-- round, code review of 2026-11-11).
--
-- 054 let anyone read every column of place_photo_credits. Travelers'
-- pages only ever show the credit line, licence and link (the backend
-- picks those), but with the site's public key anyone could also ask
-- Supabase directly and read each photo's authorization status ("Not
-- checked yet") and the account id of the admin who saved it.
--
-- Now:
--   - logged-out visitors (anon) may not read the table at all;
--   - signed-in people may read it only if they are admins (is_admin()),
--     which the dashboard needs (the credits box, "Credit missing");
--   - the backend's own login (lakat_api) still reads it, and answers
--     travelers with the credit line, licence and link only.
-- Nothing on the site changes: the browser never reads this table itself.
-- Writing stays as in 054 (admins only).
--
-- Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Who may read at all -----------------------------------------------------

revoke select on public.place_photo_credits from anon;

-- 2. Row Level Security: admins only (the backend's policy from 054 stays) --

drop policy if exists "anyone can read photo credits" on public.place_photo_credits;
drop policy if exists "admins can read photo credits" on public.place_photo_credits;

create policy "admins can read photo credits" on public.place_photo_credits for
select to authenticated using ((select public.is_admin ()));

-- 3. Check it worked ------------------------------------------------------------
--
-- Should list five policies, the SELECT ones being
-- "admins can read photo credits" and "api can read photo credits":
--   select policyname, cmd, roles from pg_policies where tablename = 'place_photo_credits';
--
-- Should not list anon:
--   select grantee from information_schema.role_table_grants
--    where table_name = 'place_photo_credits' and privilege_type = 'SELECT';
