-- A video in a review (reviews & media round, ticket 165; team decision
-- 2026-11-22).
--
-- A logged-in traveler can add one video (MP4, MOV or WebM, up to 50 MB) to
-- their own review. The video is stored exactly as uploaded, in a new
-- Supabase Storage bucket called "review-videos", in a folder named after
-- the traveler's user id, and the review remembers where it is in a new
-- video_path column ("<user id>/<file name>"). Anyone can watch the videos.
--
-- Unlike photos, the browser uploads the video straight into the traveler's
-- own folder with their login (a video is too big for the backend: Vercel
-- refuses requests over 4.5 MB); the Storage policies below decide, the same
-- way Row Level Security decides for the tables. The backend then checks the
-- file and saves video_path, as the traveler.
--
-- Nothing here touches the service_role, and Row Level Security stays on.
-- No table is added; reviews already has Row Level Security and its policies
-- ("authors can edit their own reviews": only the writer may change a row).
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Where a review's video is --------------------------------------------

alter table public.reviews
  add column if not exists video_path text;

-- Like the stars and the comment, only the writer may set or clear it (the
-- update policy on reviews limits every change to the writer's own rows).
grant insert (video_path) on public.reviews to authenticated;
grant update (video_path) on public.reviews to authenticated;

-- Everyone reads it wherever they may read the review (020 and 023 grant
-- select on the whole reviews table, so a hidden review's video stays
-- hidden with it).

-- 2. A video must be the writer's own ---------------------------------------
--
-- video_path may only point into the writer's own folder, so nobody can show
-- someone else's video on their review. A small trigger of its own, so the
-- main reviews trigger (rewritten several times since 022) is not touched.

create or replace function public.reviews_video_must_be_own()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.video_path is not null
     and (split_part(new.video_path, '/', 1) <> new.user_id::text
          or new.video_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|mov|webm)$') then
    raise exception 'That video is not yours'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists reviews_video_must_be_own on public.reviews;
create trigger reviews_video_must_be_own
  before insert or update of video_path on public.reviews
  for each row execute function public.reviews_video_must_be_own();

-- 3. The bucket -------------------------------------------------------------
--
-- public = true: anyone can watch a video by its address. The bucket itself
-- refuses files over 50 MB (52428800 bytes, the most the free plan allows
-- per file) and anything but MP4, MOV (QuickTime) or WebM.

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'review-videos',
  'review-videos',
  true,
  52428800,
  array['video/mp4', 'video/quicktime', 'video/webm']
)
on conflict (id) do nothing;

-- 4. Storage policies (who may do what with the files) ----------------------
--
-- Anything without a policy is refused. The folder is the first part of the
-- file's name: "<user id>/<file name>".

drop policy if exists "anyone can view review videos" on storage.objects;
create policy "anyone can view review videos"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'review-videos');

drop policy if exists "travelers can upload to their own video folder" on storage.objects;
create policy "travelers can upload to their own video folder"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'review-videos'
    and (storage.foldername(name))[1] = (select auth.uid ())::text
  );

drop policy if exists "travelers can replace their own videos" on storage.objects;
create policy "travelers can replace their own videos"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'review-videos'
    and (storage.foldername(name))[1] = (select auth.uid ())::text
  )
  with check (
    bucket_id = 'review-videos'
    and (storage.foldername(name))[1] = (select auth.uid ())::text
  );

drop policy if exists "travelers can delete their own videos" on storage.objects;
create policy "travelers can delete their own videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'review-videos'
    and (storage.foldername(name))[1] = (select auth.uid ())::text
  );

-- Admins may delete a review's video (deleting a review for good removes
-- its video, ticket 166), like review photos (040).
drop policy if exists "admins can delete review videos" on storage.objects;
create policy "admins can delete review videos"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'review-videos'
    and (select public.is_admin ())
  );

-- 5. Check it worked ---------------------------------------------------------
--
-- Should show video_path in the reviews columns:
--   select column_name from information_schema.columns where table_schema = 'public' and table_name = 'reviews' and column_name = 'video_path';
-- Should show the bucket, public = true, 52428800 and the three video types:
--   select id, public, file_size_limit, allowed_mime_types from storage.buckets where id = 'review-videos';
-- Should list the five storage policies above:
--   select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname like '%video%' order by policyname;
-- Should show the trigger:
--   select tgname from pg_trigger where tgname = 'reviews_video_must_be_own';
