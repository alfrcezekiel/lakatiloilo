-- A photo in a review (review extras round, ticket 81).
--
-- A traveler can add one photo (JPG, PNG or WebP, up to 2 MB) to their own
-- review. The photo lives in a Supabase Storage bucket called
-- "review-photos", in a folder named after the traveler's user id, and the
-- review remembers where it is in a new photo_path column
-- ("<user id>/<file name>"). Anyone can view the photos.
--
-- The backend uploads and deletes photos as the logged-in traveler (their
-- login is sent to Storage), so the Storage policies below decide, the same
-- way Row Level Security decides for the tables.
--
-- Nothing here touches the service_role, and Row Level Security stays on.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Where a review's photo is -----------------------------------------

alter table public.reviews
  add column if not exists photo_path text;

-- Like the stars and the comment, the writer may set or clear it.
grant insert (photo_path) on public.reviews to authenticated;
grant update (photo_path) on public.reviews to authenticated;

-- The backend reads it with the rest of the review (023 already lets
-- lakat_api read every column of reviews).

-- 2. A photo must be the writer's own ------------------------------------
--
-- photo_path may only point into the writer's own folder, so nobody can
-- show someone else's photo on their review. This is the reviews trigger
-- from 022, unchanged except for the photo_path check at the top.

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

  new.updated_at := now();
  return new;
end;
$$;

-- 3. The bucket ----------------------------------------------------------
--
-- public = true: anyone can view a photo by its address. The bucket itself
-- refuses files over 2 MB (2097152 bytes) and anything but JPG, PNG or WebP.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-photos',
  'review-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 4. Storage policies (who may do what with the files) --------------------
--
-- Anything without a policy is refused. The folder is the first part of the
-- file's name: "<user id>/<file name>".

create policy "anyone can view review photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'review-photos');

create policy "travelers can upload to their own photo folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid ())::text
  );

create policy "travelers can replace their own photos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid ())::text
  )
  with check (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid ())::text
  );

create policy "travelers can delete their own photos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'review-photos'
    and (storage.foldername(name))[1] = (select auth.uid ())::text
  );

-- 5. Check it worked -------------------------------------------------
--
-- Should show photo_path in the reviews columns:
--   select column_name from information_schema.columns where table_name = 'reviews' and column_name = 'photo_path';
-- Should show the bucket, public = true, 2097152 and the three file types:
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'review-photos';
-- Should list the four storage policies above:
--   select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like '%photo%';
