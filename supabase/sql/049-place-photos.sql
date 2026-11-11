-- Place photos uploaded from the team's computer (full admin management
-- round, ticket 119).
--
-- Until now a place's photo was a web address typed into the database
-- (Wikimedia, Unsplash). From now on the team uploads a photo file from
-- the dashboard:
--   1. a new Storage bucket, "place-photos": anyone may view; only admins
--      (038) may add, replace or delete files; JPG, PNG or WebP up to 2 MB
--      (the bucket itself refuses anything else),
--   2. admins may now change a place's photo_url, which then holds the
--      uploaded photo's public address. Older places keep their current
--      address until their photo is replaced.
--
-- Files are kept as "<destination|accommodation>/<place id>/<random>.<ext>".
-- The backend uploads and deletes them AS the logged-in admin (their login
-- is sent to Storage), so these policies decide.
--
-- Row Level Security stays on; the "admins can edit ..." policies from 043
-- already limit every place update to admins. Nothing here uses the
-- service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The bucket ------------------------------------------------------------
--
-- public = true: anyone can view a photo by its address.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'place-photos',
  'place-photos',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do nothing;

-- 2. Who may do what with the files ----------------------------------------
--
-- Anything without a policy is refused.

drop policy if exists "anyone can view place photos" on storage.objects;
drop policy if exists "admins can upload place photos" on storage.objects;
drop policy if exists "admins can replace place photos" on storage.objects;
drop policy if exists "admins can delete place photos" on storage.objects;

create policy "anyone can view place photos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'place-photos');

create policy "admins can upload place photos"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'place-photos' and (select public.is_admin ()));

create policy "admins can replace place photos"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'place-photos' and (select public.is_admin ()))
  with check (bucket_id = 'place-photos' and (select public.is_admin ()));

create policy "admins can delete place photos"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'place-photos' and (select public.is_admin ()));

-- 3. Admins may change a place's photo address ------------------------------

grant update (photo_url) on public.destinations to authenticated;
grant update (photo_url) on public.accommodations to authenticated;

-- It must be a secure web address of reasonable length (the backend only
-- ever saves the uploaded photo's own address).
alter table public.destinations drop constraint if exists destinations_photo_url_https;
alter table public.destinations add constraint destinations_photo_url_https check (
    photo_url is null or (photo_url like 'https://%' and char_length(photo_url) <= 500)
);

alter table public.accommodations drop constraint if exists accommodations_photo_url_https;
alter table public.accommodations add constraint accommodations_photo_url_https check (
    photo_url is null or (photo_url like 'https://%' and char_length(photo_url) <= 500)
);

-- 4. Check it worked ----------------------------------------------------------
--
-- Should show the bucket, public = true, 2097152 and the three file types:
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'place-photos';
--
-- Should list the four policies above:
--   select policyname, cmd from pg_policies
--    where schemaname = 'storage' and tablename = 'objects' and policyname like '%place photos%';
--
-- Should be true (admins, through Row Level Security, may change the photo):
--   select has_column_privilege('authenticated', 'public.destinations', 'photo_url', 'UPDATE');
