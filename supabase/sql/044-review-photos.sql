-- Up to four photos per review (admin dashboard & moderation round,
-- ticket 113).
--
-- Until now a review could hold one photo, in reviews.photo_path (027).
-- This adds a review_photos table: one row per photo, at most 4 per
-- review, each in position 1 to 4. Every existing photo is copied into it
-- as position 1, so old single photos keep showing.
--
-- reviews.photo_path is NOT dropped yet: the live site keeps using it until
-- the team pushes the new code. A later file (after the push) copies any
-- photo added in between and then drops the column. (Change from the spec,
-- 2026-11-09: dropping it now would break photos on the live site.)
--
-- Who may do what (Row Level Security, with explicit policies):
--   - read: anyone may see the photos of reviews they may read. The rule
--     asks the reviews table, so photos of a hidden review are only seen
--     by its writer and admins (040), the same as the review.
--   - add: only the review's writer, into their own Storage folder, and at
--     most 4 per review (checked by the trigger below).
--   - remove: only the review's writer.
--   - Deleting a review deletes its photo rows (on delete cascade); the
--     backend then deletes the files. Admins may already delete photo
--     files from Storage (040).
--
-- The Storage bucket is unchanged: JPG, PNG or WebP, up to 2 MB, travelers
-- write only into their own folder (027).
--
-- Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ----------------------------------------------------------

create table if not exists public.review_photos (
    id uuid primary key default gen_random_uuid (),
    -- The review it belongs to. Deleting the review deletes its photos.
    review_id uuid not null references public.reviews (id) on delete cascade,
    -- Where the file is in the review-photos bucket: "<user id>/<file>".
    photo_path text not null unique,
    -- 1 to 4, in the order they were added. Set by the trigger below.
    position smallint not null check (position between 1 and 4),
    created_at timestamptz not null default now(),
    unique (review_id, position)
);

create index if not exists review_photos_review_id on public.review_photos (review_id);

-- 2. What website users and the backend may touch at all -------------------

revoke all on public.review_photos from anon, authenticated;

grant select on public.review_photos to anon, authenticated;
-- Only the review and the file; id, position and date are set for them.
grant insert (review_id, photo_path) on public.review_photos to authenticated;
grant delete on public.review_photos to authenticated;

-- The backend's own login reads photos for the place pages and profiles.
grant select on public.review_photos to lakat_api;

-- 3. Row Level Security -----------------------------------------------------

alter table public.review_photos enable row level security;

drop policy if exists "anyone can see photos of reviews they can read" on public.review_photos;
drop policy if exists "api can see photos of visible reviews" on public.review_photos;
drop policy if exists "writers can add photos to their own reviews" on public.review_photos;
drop policy if exists "writers can remove photos from their own reviews" on public.review_photos;

-- The reviews rules decide (a hidden review's photos stay hidden too).
create policy "anyone can see photos of reviews they can read" on public.review_photos for
select to anon, authenticated using (
    exists (select 1 from public.reviews r where r.id = review_id)
);

create policy "api can see photos of visible reviews" on public.review_photos for
select to lakat_api using (
    exists (select 1 from public.reviews r where r.id = review_id)
);

create policy "writers can add photos to their own reviews" on public.review_photos for
insert to authenticated with check (
    exists (
        select 1 from public.reviews r
         where r.id = review_id and r.user_id = (select auth.uid ())
    )
);

create policy "writers can remove photos from their own reviews" on public.review_photos for
delete to authenticated using (
    exists (
        select 1 from public.reviews r
         where r.id = review_id and r.user_id = (select auth.uid ())
    )
);

-- 4. At most 4, in the writer's own folder, numbered 1 to 4 -------------------
--
-- Runs before each new photo. It locks the review row first, so two photos
-- sent at the same moment cannot both become the 5th.

create or replace function public.review_photos_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  writer uuid;
begin
  select r.user_id into writer from public.reviews r where r.id = new.review_id for update;
  if writer is null then
    raise exception 'That review does not exist' using errcode = '23503';
  end if;

  if split_part(new.photo_path, '/', 1) <> writer::text then
    raise exception 'That photo is not yours' using errcode = '42501';
  end if;

  if (select count(*) from public.review_photos p where p.review_id = new.review_id) >= 4 then
    raise exception 'A review can have up to 4 photos.' using errcode = '23514';
  end if;

  -- The first free place, 1 to 4 (a removed photo frees its place).
  select min(n) into new.position
    from generate_series(1, 4) as n
   where not exists (
     select 1 from public.review_photos p
      where p.review_id = new.review_id and p.position = n
   );
  new.created_at := now();
  return new;
end;
$$;

revoke all on function public.review_photos_before_insert() from public, anon, authenticated;

drop trigger if exists review_photos_before_insert on public.review_photos;

create trigger review_photos_before_insert
  before insert on public.review_photos
  for each row execute function public.review_photos_before_insert();

-- 5. Copy every existing photo in (position 1) ---------------------------------

insert into public.review_photos (review_id, photo_path)
select id, photo_path
  from public.reviews
 where photo_path is not null
on conflict (photo_path) do nothing;

-- 6. Live updates ---------------------------------------------------------------
--
-- On the Realtime list, so an open place page shows new or removed photos
-- (the website only uses it as a doorbell, then asks the backend again).

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public'
       and tablename = 'review_photos'
  ) then
    alter publication supabase_realtime add table public.review_photos;
  end if;
end;
$$;

-- 7. Check it worked --------------------------------------------------------------
--
-- Should be the same two numbers (every old photo copied):
--   select (select count(*) from public.reviews where photo_path is not null) as old_photos,
--          (select count(*) from public.review_photos) as copied;
--
-- Should list the four policies above:
--   select policyname, cmd, roles from pg_policies where tablename = 'review_photos';
--
-- Should list review_photos (and still NOT review_reports):
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and schemaname = 'public' order by 1;
