-- A category's icon and card photo (admin extras round, ticket 142).
--
-- On the dashboard's Categories page, Edit also chooses:
--   - an icon for the category's card on the home page, from a fixed list
--     (empty = its default: the built-in one's own icon, or a pin for a
--     destination category and a bed for an accommodation kind);
--   - the card's photo: the photo of one of its own places (empty = as
--     today: the built-in one's own photo, or its first place's photo).
-- Only a place's photo can be chosen, never a new upload, so the card's
-- photo always has its credits; a photo whose credits are not allowed shows
-- the splash art (ticket 138).
--
-- Who may do what: anyone may read them (like the names); only admins may
-- change them (the policy from 057, now for these two columns too). The
-- database checks the icon is one from the list and the place is one of
-- this category's own. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The two new columns --------------------------------------------------------

alter table public.place_categories
  add column if not exists icon text check (
    icon is null or icon in (
      'mountain', 'utensils', 'footprints', 'party', 'trees', 'landmark',
      'hotel', 'building', 'waves', 'tent', 'coffee', 'church', 'camera',
      'ship', 'palm', 'pin'
    )
  );

alter table public.place_categories
  add column if not exists photo_place_id uuid;

-- 2. Only admins may change them (the 057 policy already asks is_admin()) ------

grant update (icon, photo_place_id) on public.place_categories to authenticated;

-- 3. The photo must be one of this category's own places ---------------------
--
-- Checked when it is chosen. If that place later moves to another category
-- or is deleted, the home page simply goes back to the default photo.

create or replace function public.place_categories_check_photo_place()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.photo_place_id is not null
     and new.photo_place_id is distinct from old.photo_place_id
     and not (
       (new.applies_to = 'destination' and exists (
          select 1 from public.destinations d where d.id = new.photo_place_id and d.category = new.id))
       or (new.applies_to = 'accommodation' and exists (
          select 1 from public.accommodations a where a.id = new.photo_place_id and a.type = new.id))
     ) then
    raise exception 'Please choose a photo of one of this category''s own places.' using errcode = '23514';
  end if;
  return new;
end;
$$;

revoke all on function public.place_categories_check_photo_place() from public, anon;

drop trigger if exists place_categories_check_photo_place on public.place_categories;

create trigger place_categories_check_photo_place
  before update of photo_place_id on public.place_categories
  for each row execute function public.place_categories_check_photo_place();

-- 4. Check it worked ------------------------------------------------------------
--
-- Should list icon and photo_place_id:
--   select column_name from information_schema.columns
--    where table_name = 'place_categories' and column_name in ('icon', 'photo_place_id');
--
-- Should list name, icon and photo_place_id:
--   select column_name from information_schema.column_privileges
--    where table_name = 'place_categories' and grantee = 'authenticated'
--      and privilege_type = 'UPDATE';
