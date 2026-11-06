-- Names shorter than 2 characters show as "Traveler" (profile & replies
-- round, ticket 98 code review).
--
-- The website and the backend only accept display names of 2 to 40
-- characters. But Supabase lets any logged-in traveler change their own
-- account details directly, skipping both, so a 1-character name could
-- still reach their reviews and replies. Now the database itself uses
-- "Traveler" for any name under 2 characters, the same as it already does
-- for an empty one. Longer names are cut to 40 as before.
--
-- Safety: one small helper function with the name rule, used by the three
-- triggers that copy a name onto reviews and replies (from 025, 030).
-- Each trigger is otherwise exactly as before. Row Level Security and the
-- policies are unchanged. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The name rule, in one place -------------------------------------
--
-- Trimmed and cut to 40 characters; "Traveler" when that leaves fewer
-- than 2. "immutable": the same details always give the same name.

create or replace function public.public_name_of(details jsonb)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
           when char_length(left(btrim(details ->> 'display_name'), 40)) >= 2
             then left(btrim(details ->> 'display_name'), 40)
           else 'Traveler'
         end;
$$;

-- 2. Reviews: the same as 030, with the helper for the name --------------

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

  select public.public_name_of(u.raw_user_meta_data),
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

-- 3. New replies: the same as 025, with the helper for the name ----------

create or replace function public.review_replies_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select public.public_name_of(u.raw_user_meta_data),
         case
           when u.raw_user_meta_data ->> 'traveler_type' in ('local', 'domestic', 'foreign')
             then u.raw_user_meta_data ->> 'traveler_type'
         end
    into new.replier_name, new.traveler_type
    from auth.users u
   where u.id = new.user_id;

  new.created_at := now();
  return new;
end;
$$;

-- 4. A changed name: the same as 030, with the helper for the name -------

create or replace function public.copy_profile_to_reviews_and_replies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_name text := public.public_name_of(new.raw_user_meta_data);
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

-- 5. Fix any 1-character name already saved ---------------------------
--
-- The triggers above fill in the name again from the account, and keep
-- each review's and reply's "last edited" time (030, 031).

update public.reviews set reviewer_name = 'Traveler'
 where char_length(reviewer_name) < 2;

update public.review_replies set replier_name = 'Traveler'
 where char_length(replier_name) < 2;

-- 6. Check it worked -------------------------------------------------
--
-- Should answer Traveler, Traveler, Al:
--   select public.public_name_of('{"display_name": "A"}'),
--          public.public_name_of('{"display_name": "   "}'),
--          public.public_name_of('{"display_name": "  Al  "}');
--
-- Should answer 0 (no name under 2 characters):
--   select count(*) from public.reviews where char_length(reviewer_name) < 2;
--
-- Row Level Security should still be on (rowsecurity = true):
--   select relname, relrowsecurity as rowsecurity from pg_class
--    where relname in ('reviews', 'review_replies');
