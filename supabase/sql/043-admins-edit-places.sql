-- Admins may correct place details (admin dashboard & moderation round,
-- ticket 112: the Places screen).
--
-- Admins (038) may change ONLY these columns:
--   - destinations:   name, description, address
--   - accommodations: name, description, address, phone, email
-- Nobody may add or delete places through the app (not even admins), and
-- nobody may change the photo, category or kind, location or map position.
-- Everyone may still read every place.
--
-- Tightened while here: Supabase had given the website's roles (anon and
-- authenticated) every permission on both tables (insert, update, delete).
-- Row Level Security already refused all writes, because there were no
-- write policies (002, 004), but now the permissions say the same thing:
-- read for everyone, and update of the columns above for logged-in people,
-- which Row Level Security then narrows to admins.
--
-- The database also checks the lengths, so a bad value is refused even if
-- it got past the website and the backend:
--   name 1-100, address 1-200, description 1-1000 characters,
--   phone up to 40 and email up to 120 characters (or empty).
-- Every current place already fits.
--
-- The tables are already on the Realtime list (029), so an open place page
-- shows the change at once. updated_at is set by the existing
-- update_*_updated_at triggers.
--
-- Safety: Row Level Security stays on; the new update policies ask
-- is_admin(). Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. What the website's roles may do at all ------------------------------

revoke insert, update, delete, truncate, references, trigger
    on public.destinations, public.accommodations
  from anon, authenticated;

grant select on public.destinations, public.accommodations to anon, authenticated;

grant update (name, description, address) on public.destinations to authenticated;
grant update (name, description, address, phone, email) on public.accommodations to authenticated;

-- 2. Row Level Security: only admins may change a place -------------------

drop policy if exists "admins can edit destinations" on public.destinations;

create policy "admins can edit destinations" on public.destinations for
update to authenticated
    using ((select public.is_admin ()))
    with check ((select public.is_admin ()));

drop policy if exists "admins can edit accommodations" on public.accommodations;

create policy "admins can edit accommodations" on public.accommodations for
update to authenticated
    using ((select public.is_admin ()))
    with check ((select public.is_admin ()));

-- 3. Lengths the database checks itself -------------------------------------

alter table public.destinations drop constraint if exists destinations_text_lengths;
alter table public.destinations add constraint destinations_text_lengths check (
    char_length(btrim(name)) between 1 and 100
    and char_length(btrim(address)) between 1 and 200
    and (description is null or char_length(btrim(description)) between 1 and 1000)
);

alter table public.accommodations drop constraint if exists accommodations_text_lengths;
alter table public.accommodations add constraint accommodations_text_lengths check (
    char_length(btrim(name)) between 1 and 100
    and char_length(btrim(address)) between 1 and 200
    and (description is null or char_length(btrim(description)) between 1 and 1000)
    and (phone is null or char_length(phone) <= 40)
    and (email is null or char_length(email) <= 120)
);

-- 4. Check it worked ----------------------------------------------------------
--
-- Each table should list its read policies and the new admin update policy:
--   select tablename, policyname, cmd from pg_policies
--    where tablename in ('destinations', 'accommodations') order by 1, 3;
--
-- Should be false, false, false, true (no insert/update/delete on the whole
-- table any more, still read):
--   select has_table_privilege('authenticated', 'public.destinations', 'INSERT'),
--          has_table_privilege('authenticated', 'public.destinations', 'UPDATE'),
--          has_table_privilege('authenticated', 'public.destinations', 'DELETE'),
--          has_table_privilege('authenticated', 'public.destinations', 'SELECT');
--
-- Should be true for description, false for photo_url:
--   select has_column_privilege('authenticated', 'public.destinations', 'description', 'UPDATE'),
--          has_column_privilege('authenticated', 'public.destinations', 'photo_url', 'UPDATE');
