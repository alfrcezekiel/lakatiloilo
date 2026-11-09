-- Hiding reviews, and what admins may do to a reported review (admin
-- dashboard & moderation round, ticket 109: Keep it, Hide it, Delete
-- review).
--
-- What changes:
--   1. reviews gets hidden_at: when the team hid it, or empty.
--   2. A hidden review can only be read by its writer and by admins. The
--      backend's own reading login (lakat_api) no longer sees hidden
--      reviews at all, so the place page, the ratings and public profiles
--      leave them out by themselves. (The writer's own hidden review is
--      read as the writer, with their login.)
--   3. Only admins may hide or show a review again. The writer cannot
--      unhide their own review, and an admin cannot change anyone's stars,
--      text or photo: the review trigger refuses both.
--   4. Admins may delete any review. Its replies, likes, reports and
--      notifications go with it (on delete cascade, as today), and admins
--      may delete its photo from Storage.
--   5. Admins may delete reports ("Keep it" removes a review's reports).
--
-- Safety: Row Level Security stays on everywhere; every new permission is
-- a policy that asks is_admin() (038). Nothing here uses the service_role
-- key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. When the review was hidden -----------------------------------------

alter table public.reviews
  add column if not exists hidden_at timestamptz;

-- Only the hidden_at column is new for logged-in people; Row Level
-- Security (3) and the trigger (4) decide who may actually change it.
grant update (hidden_at) on public.reviews to authenticated;

-- 2. Who may read a hidden review -------------------------------------------
--
-- Logged out: only reviews that are not hidden. Logged in: those, plus your
-- own hidden ones, plus all of them for admins.

drop policy if exists "anyone can read reviews" on public.reviews;
drop policy if exists "anyone can read visible reviews" on public.reviews;
drop policy if exists "travelers can read visible and their own reviews" on public.reviews;

create policy "anyone can read visible reviews" on public.reviews for
select to anon using (hidden_at is null);

create policy "travelers can read visible and their own reviews" on public.reviews for
select to authenticated using (
    hidden_at is null
    or (select auth.uid ()) = user_id
    or (select public.is_admin ())
);

-- The backend's own login reads only what everyone may read.
drop policy if exists "api can read reviews" on public.reviews;
drop policy if exists "api can read visible reviews" on public.reviews;

create policy "api can read visible reviews" on public.reviews for
select to lakat_api using (hidden_at is null);

-- 3. Admins may hide, show and delete any review ---------------------------

drop policy if exists "admins can hide and show reviews" on public.reviews;

create policy "admins can hide and show reviews" on public.reviews for
update to authenticated
    using ((select public.is_admin ()))
    with check ((select public.is_admin ()));

drop policy if exists "admins can delete any review" on public.reviews;

create policy "admins can delete any review" on public.reviews for
delete to authenticated using ((select public.is_admin ()));

-- 4. The review trigger: who may change hidden_at ---------------------------
--
-- The same as 033, plus two checks at the top for updates:
--   - only an admin may change hidden_at (so a writer cannot unhide their
--     own review, even though they may edit it),
--   - an admin changing someone else's review may change only hidden_at
--     (never the stars, text or photo).
-- Hiding or showing does not change updated_at, so it never looks
-- "edited".

create or replace function public.reviews_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    if new.hidden_at is distinct from old.hidden_at and not public.is_admin() then
      raise exception 'Only the Lakat Iloilo team can hide or show a review'
        using errcode = '42501';
    end if;
    if (select auth.uid()) is distinct from old.user_id
       and public.is_admin()
       and (new.rating is distinct from old.rating
            or new.comment is distinct from old.comment
            or new.photo_path is distinct from old.photo_path) then
      raise exception 'The team can hide or delete a review, not change it'
        using errcode = '42501';
    end if;
  end if;

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
    -- A new review is never hidden.
    new.hidden_at := null;
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

-- 5. Admins may delete a review's photo -----------------------------------

drop policy if exists "admins can delete review photos" on storage.objects;

create policy "admins can delete review photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'review-photos'
    and (select public.is_admin ())
  );

-- 6. Admins may delete reports ("Keep it") ----------------------------------

grant delete on public.review_reports to authenticated;

drop policy if exists "admins can delete reports" on public.review_reports;

create policy "admins can delete reports" on public.review_reports for
delete to authenticated using ((select public.is_admin ()));

-- 7. Check it worked ------------------------------------------------------
--
-- Should show hidden_at:
--   select column_name from information_schema.columns
--    where table_name = 'reviews' and column_name = 'hidden_at';
--
-- reviews should list: anyone can read visible reviews (SELECT, anon),
-- travelers can read visible and their own reviews (SELECT),
-- api can read visible reviews (SELECT, lakat_api), admins can hide and
-- show reviews (UPDATE), admins can delete any review (DELETE), and the
-- older add / edit / delete-your-own policies:
--   select policyname, cmd, roles from pg_policies where tablename = 'reviews';
--
-- review_reports should list three: the INSERT one, admins can read
-- reports (SELECT) and admins can delete reports (DELETE):
--   select policyname, cmd from pg_policies where tablename = 'review_reports';
--
-- Storage should list "admins can delete review photos":
--   select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects' and policyname like '%photo%';
