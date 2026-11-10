-- Retire the old single photo (admin dashboard & moderation round, ticket
-- 113's last step, after the team confirmed the round on the live URL).
--
-- Reviews keep their photos in the review_photos table now (044). The old
-- reviews.photo_path column was kept only until the new code was live.
-- This file finishes the move:
--   1. copies any photo that was added with the old code after 044 ran
--      (only if its file still exists and the review has room),
--   2. removes photo rows whose file no longer exists in Storage (a photo
--      that was replaced or removed with the old code in between),
--   3. rewrites the review guard without photo_path (the same as 042
--      otherwise; "that photo is not yours" is checked by the
--      review_photos trigger since 044),
--   4. drops reviews.photo_path (its permissions go with it).
--
-- IMPORTANT: run this only after the code that no longer uses photo_path
-- is live (the commit that adds this file). Running it earlier would break
-- deleting reviews on the live site.
--
-- Row Level Security is unchanged. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Copy photos added in between ------------------------------------------

insert into public.review_photos (review_id, photo_path)
select r.id, r.photo_path
  from public.reviews r
 where r.photo_path is not null
   and exists (
     select 1 from storage.objects o
      where o.bucket_id = 'review-photos' and o.name = r.photo_path
   )
   and (select count(*) from public.review_photos p where p.review_id = r.id) < 4
on conflict (photo_path) do nothing;

-- 2. Remove photo rows whose file is gone -------------------------------------

delete from public.review_photos p
 where not exists (
   select 1 from storage.objects o
    where o.bucket_id = 'review-photos' and o.name = p.photo_path
 );

-- 3. The review guard, without photo_path -------------------------------------

create or replace function public.reviews_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Auto-hide (ticket 110): hiding a review that really has 3 or more
    -- reports is allowed for anyone, because the database counts them
    -- itself here. Showing it again is still for admins only.
    if new.hidden_at is distinct from old.hidden_at
       and not public.is_admin()
       and not (
         old.hidden_at is null
         and new.hidden_at is not null
         and (select count(*) from public.review_reports rr where rr.review_id = old.id) >= 3
       ) then
      raise exception 'Only the Lakat Iloilo team can hide or show a review'
        using errcode = '42501';
    end if;
    if (select auth.uid()) is distinct from old.user_id
       and public.is_admin()
       and (new.rating is distinct from old.rating
            or new.comment is distinct from old.comment) then
      raise exception 'The team can hide or delete a review, not change it'
        using errcode = '42501';
    end if;
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
     or new.comment is distinct from old.comment then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

-- 4. Drop the old column --------------------------------------------------------

alter table public.reviews drop column if exists photo_path;

-- 5. Check it worked --------------------------------------------------------------
--
-- Should return no row (the column is gone):
--   select column_name from information_schema.columns
--    where table_schema = 'public' and table_name = 'reviews' and column_name = 'photo_path';
--
-- Should be 0 (every photo row has its file):
--   select count(*) from public.review_photos p
--    where not exists (select 1 from storage.objects o
--                       where o.bucket_id = 'review-photos' and o.name = p.photo_path);
