-- Check 15 — review videos are locked down (tickets 165 and 166,
-- supabase/sql/065 and 066).
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- SAFE = "Success. No rows returned."
-- Each row names one thing that is wrong, in plain words.

with
bucket as (
  select * from storage.buckets where id = 'review-videos'
),
video_policies as (
  select policyname, cmd, roles, qual, with_check
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
    and (coalesce(qual, '') like '%review-videos%' or coalesce(with_check, '') like '%review-videos%')
),
problems as (
  select 'The review-videos bucket does not exist (run supabase/sql/065).' as problem
  where not exists (select 1 from bucket)

  union all
  select 'The review-videos bucket allows files over 50 MB, or has no limit.'
  from bucket where file_size_limit is null or file_size_limit > 52428800

  union all
  select 'The review-videos bucket allows file types other than MP4, MOV and WebM.'
  from bucket
  where allowed_mime_types is null
     or not (allowed_mime_types <@ array['video/mp4', 'video/quicktime', 'video/webm'])

  union all
  -- A stranger (not logged in) may only watch, never upload, replace or delete.
  select 'Someone not logged in may ' || lower(cmd) || ' review videos: ' || policyname
  from video_policies
  where cmd <> 'SELECT' and ('anon' = any (roles) or 'public' = any (roles))

  union all
  -- Every upload, replace or delete rule must tie the file to the
  -- traveler's own folder, or to an admin.
  select 'This rule lets a traveler ' || lower(cmd) || ' videos outside their own folder: ' || policyname
  from video_policies
  where cmd in ('INSERT', 'UPDATE', 'DELETE')
    and coalesce(with_check, qual) not like '%auth.uid()%'
    and coalesce(with_check, qual) not like '%is_admin()%'

  union all
  select 'The rule that keeps a video in its writer''s own folder (trigger reviews_video_must_be_own) is missing.'
  where not exists (select 1 from pg_trigger where tgname = 'reviews_video_must_be_own' and not tgisinternal)

  union all
  -- 066 (ticket 166): the list of Trash videos is for admins only.
  select 'The Trash videos list (admin_trashed_review_videos, 066) is missing.'
  where not exists (select 1 from pg_proc where proname = 'admin_trashed_review_videos')

  union all
  select 'Someone not logged in may call admin_trashed_review_videos.'
  where exists (select 1 from pg_proc where proname = 'admin_trashed_review_videos')
    and has_function_privilege('anon', 'public.admin_trashed_review_videos()', 'execute')

  union all
  select 'Someone not logged in may set a review''s video_path.'
  from information_schema.column_privileges
  where table_schema = 'public' and table_name = 'reviews' and column_name = 'video_path'
    and grantee = 'anon' and privilege_type in ('INSERT', 'UPDATE')
)
select problem from problems;
