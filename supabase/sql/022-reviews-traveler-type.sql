-- "I'm traveling as" tag on reviews (ticket 44, login extras round).
--
-- At sign-up a traveler picks Local Ilonggo, Visitor from PH or Foreign
-- tourist. It is saved on their account (next to display_name) as
-- traveler_type = 'local', 'domestic' or 'foreign'. Each review copies it,
-- the same way it copies reviewer_name, so the reviews section can show
-- "Juan · Local Ilonggo".
--
-- Safety: the browser can never type this column. The insert and update
-- grants from 020 list only the columns the browser may send, and this
-- column is not one of them; the trigger below always fills it from the
-- account. Row Level Security and its policies are unchanged.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The new column -------------------------------------------------
--
-- Empty (null) for accounts made before this round, which have no
-- traveler type. Those reviews simply show no tag.

alter table public.reviews
  add column if not exists traveler_type text
  check (traveler_type in ('local', 'domestic', 'foreign'));

-- 2. The same trigger function as in 021, now also copying the type ---

create or replace function public.reviews_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.place_type = 'destination'
       and not exists (select 1 from public.destinations where id = new.place_id) then
      raise exception 'That destination does not exist';
    elsif new.place_type = 'accommodation'
       and not exists (select 1 from public.accommodations where id = new.place_id) then
      raise exception 'That accommodation does not exist';
    end if;
    new.created_at := now();
  end if;

  -- The display name, trimmed and cut to 40 characters, or "Traveler".
  -- The traveler type, only if it is one of the three allowed values
  -- (an account made through Supabase's API could hold anything).
  select coalesce(
           nullif(left(btrim(u.raw_user_meta_data ->> 'display_name'), 40), ''),
           'Traveler'
         ),
         case
           when u.raw_user_meta_data ->> 'traveler_type' in ('local', 'domestic', 'foreign')
             then u.raw_user_meta_data ->> 'traveler_type'
         end
    into new.reviewer_name, new.traveler_type
    from auth.users u
   where u.id = new.user_id;

  new.updated_at := now();
  return new;
end;
$$;

-- 3. Fill in the type on reviews that already exist -------------------
--
-- Only accounts that already have a traveler type are changed. The
-- trigger is paused so the reviews keep their real "last edited" time.

alter table public.reviews disable trigger reviews_before_write;

update public.reviews r
   set traveler_type = u.raw_user_meta_data ->> 'traveler_type'
  from auth.users u
 where u.id = r.user_id
   and u.raw_user_meta_data ->> 'traveler_type' in ('local', 'domestic', 'foreign');

alter table public.reviews enable trigger reviews_before_write;

-- 4. Check it worked -------------------------------------------------
--
-- This should list the new column, with type "text":
--   select column_name, data_type from information_schema.columns
--    where table_name = 'reviews' and column_name = 'traveler_type';
