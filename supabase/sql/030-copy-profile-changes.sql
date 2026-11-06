-- Changing your display name and traveler type (profile & replies round,
-- ticket 94).
--
-- A traveler can now change their display name and traveler type on
-- their profile. Both live on their Supabase Auth account (auth.users),
-- and every review and reply keeps its own copy of them (reviewer_name,
-- replier_name, traveler_type; see 022 and 025). So when the account
-- changes, this file makes the database copy the new name and type onto
-- all of that traveler's reviews and replies straight away.
--
-- Safety: the copying is done by the database from the account itself,
-- never from anything the browser sends, so nobody can put a name on
-- someone else's rows. Row Level Security and its policies are unchanged
-- on both tables. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Copying the name no longer counts as "editing" a review -----------
--
-- The reviews trigger from 027 set updated_at on every change. Now it
-- only does so when the traveler changes what they wrote (stars, text or
-- photo), so a name change keeps each review's real "last edited" time.
-- Everything else is the same as in 027.

create or replace function public.reviews_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.photo_path is not null
     and split_part(new.photo_path, '/', 1) <> new.user_id::text then
    raise exception 'That photo is not yours'
      using errcode = '42501';
  end if;

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

  if tg_op = 'INSERT'
     or new.rating is distinct from old.rating
     or new.comment is distinct from old.comment
     or new.photo_path is distinct from old.photo_path then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

-- 2. Copy a changed name and type onto reviews and replies ---------------
--
-- Runs after an account's details (raw_user_meta_data) change, and only
-- when the name or type really changed (Supabase also updates accounts at
-- every log-in). Uses the same rules as 022 and 025: the name trimmed and
-- cut to 40 characters, or "Traveler"; the type only if it is one of the
-- three allowed values. "security definer" lets it read the account and
-- update every row of this one traveler; search_path = '' and full table
-- names stop anyone from tricking it into using a look-alike table.

create or replace function public.copy_profile_to_reviews_and_replies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_name text := coalesce(
    nullif(left(btrim(new.raw_user_meta_data ->> 'display_name'), 40), ''),
    'Traveler'
  );
  new_type text := case
    when new.raw_user_meta_data ->> 'traveler_type' in ('local', 'domestic', 'foreign')
      then new.raw_user_meta_data ->> 'traveler_type'
  end;
begin
  -- The reviews trigger above fills in the name and type from the account
  -- again and keeps updated_at as it was.
  update public.reviews
     set reviewer_name = new_name,
         traveler_type = new_type
   where user_id = new.id
     and (reviewer_name is distinct from new_name
          or traveler_type is distinct from new_type);

  update public.review_replies
     set replier_name = new_name,
         traveler_type = new_type
   where user_id = new.id
     and (replier_name is distinct from new_name
          or traveler_type is distinct from new_type);

  return new;
end;
$$;

drop trigger if exists copy_profile_to_reviews_and_replies on auth.users;

create trigger copy_profile_to_reviews_and_replies
  after update of raw_user_meta_data on auth.users
  for each row
  when (
    old.raw_user_meta_data ->> 'display_name' is distinct from new.raw_user_meta_data ->> 'display_name'
    or old.raw_user_meta_data ->> 'traveler_type' is distinct from new.raw_user_meta_data ->> 'traveler_type'
  )
  execute function public.copy_profile_to_reviews_and_replies();

-- 3. Check it worked -------------------------------------------------
--
-- Should list the new trigger on auth.users:
--   select tgname from pg_trigger
--    where tgrelid = 'auth.users'::regclass and not tgisinternal;
--
-- Row Level Security should still be on for both tables (rowsecurity = true):
--   select relname, relrowsecurity as rowsecurity from pg_class
--    where relname in ('reviews', 'review_replies');
--
-- Every review and reply should match its writer's account (0 rows):
--   select r.id from public.reviews r join auth.users u on u.id = r.user_id
--    where r.reviewer_name <> coalesce(nullif(left(btrim(u.raw_user_meta_data ->> 'display_name'), 40), ''), 'Traveler');
