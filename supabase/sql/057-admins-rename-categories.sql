-- Admins may rename a category or kind (admin extras round, ticket 141).
--
-- On the dashboard's Categories page, "Edit" changes a category's or
-- kind's name, for example "Food" to "Food & Drinks". Only the name: its
-- id (what places point at, for example "food") and whether it is for
-- destinations or accommodations never change, so no place is touched.
--
-- The rules from 047 still decide every name: 2 to 30 characters, and not
-- the same as another one, whatever its capitals ("Beaches" and
-- "beaches"). The eight built-in ones may be renamed too.
--
-- Who may do what: only admins (is_admin(), 038), through a new Row
-- Level Security policy, and only the name column. Travelers still cannot
-- change anything. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Only the name may change ----------------------------------------------

grant update (name) on public.place_categories to authenticated;

-- 2. Only admins --------------------------------------------------------------

drop policy if exists "admins can rename categories" on public.place_categories;

create policy "admins can rename categories" on public.place_categories for
update to authenticated using ((select public.is_admin ()))
with check ((select public.is_admin ()));

-- 3. Check it worked ------------------------------------------------------------
--
-- Should list an UPDATE policy:
--   select policyname, cmd from pg_policies
--    where tablename = 'place_categories' and cmd = 'UPDATE';
--
-- Should list name as the only column authenticated may update:
--   select column_name from information_schema.column_privileges
--    where table_name = 'place_categories' and grantee = 'authenticated'
--      and privilege_type = 'UPDATE';
