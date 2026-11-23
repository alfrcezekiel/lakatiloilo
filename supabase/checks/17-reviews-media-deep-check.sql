-- Check 17 — the new reviews & media features, rules AND saved files
-- (tickets 164–167, supabase/sql/065, 066 and 067).
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: checks 15 and 16 ask "is the rule there?". This one goes further:
-- - Is each rule strict enough? (A rule that only asks "are you logged in?"
--   would let any traveler delete someone else's video.)
-- - Do the saved reviews and the files in Storage agree? (A review pointing
--   at a missing video, or a video no review uses, filling the free 1 GB.)
--
-- It only counts. No traveler's name, text or file name is shown.
--
-- SAFE = all 26 rows say "✓ safe" (every "found" is 0).
-- A "✗ look at this" row: paste the result to your agent. Fix a rule with
-- the next supabase/sql/NNN file. Never delete a file or a row by hand
-- before you know how it got there.
--
-- Row 21 ignores videos uploaded in the last 24 hours, so a traveler who is
-- saving a review right now is not counted.

with
expected_video_rules (policyname, cmd) as (
  values
    ('anyone can view review videos', 'SELECT'),
    ('travelers can upload to their own video folder', 'INSERT'),
    ('travelers can replace their own videos', 'UPDATE'),
    ('travelers can delete their own videos', 'DELETE'),
    ('admins can delete review videos', 'DELETE')
),
storage_rules as (
  select policyname, cmd, roles, coalesce(qual, '') as qual, coalesce(with_check, '') as with_check
  from pg_policies
  where schemaname = 'storage' and tablename = 'objects'
),
video_rules as (
  select * from storage_rules
  where qual like '%review-videos%' or with_check like '%review-videos%'
),
admin_functions as (
  select p.oid, p.proname, p.prosrc, p.prosecdef, p.provolatile, p.proconfig
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.proname in ('admin_trashed_review_videos', 'admin_storage_used')
),
video_trigger as (
  select t.tgtype::int as tgtype, t.tgenabled, p.prosrc, p.proconfig
  from pg_trigger t
  join pg_proc p on p.oid = t.tgfoid
  where t.tgname = 'reviews_video_must_be_own'
    and t.tgrelid = 'public.reviews'::regclass
    and not t.tgisinternal
),
files as (
  select o.bucket_id,
         o.name,
         o.owner_id,
         o.created_at,
         (o.metadata ->> 'size')::bigint as size,
         o.metadata ->> 'mimetype' as mimetype
  from storage.objects o
  -- The Supabase dashboard adds this empty file to a folder made by hand.
  where o.name not like '%.emptyFolderPlaceholder'
),
video_files as (
  select * from files where bucket_id = 'review-videos'
),
photo_files as (
  select * from files where bucket_id in ('place-photos', 'review-photos')
),
saved_videos as (
  -- Reviews in the Trash count too: they keep their video until deleted
  -- for good.
  select r.id, r.user_id, r.video_path
  from public.reviews r
  where r.video_path is not null
),
checks (check_name, found) as (
  -- The bucket -------------------------------------------------------------
  select '01 the review-videos bucket exists and anyone can watch',
         (case when exists (select 1 from storage.buckets where id = 'review-videos' and public) then 0 else 1 end)::bigint

  union all
  select '02 the video bucket stops at exactly 50 MB',
         (case when exists (select 1 from storage.buckets where id = 'review-videos' and file_size_limit = 52428800) then 0 else 1 end)::bigint

  union all
  select '03 the video bucket takes exactly MP4, MOV and WebM',
         (case when exists (
            select 1 from storage.buckets
            where id = 'review-videos'
              and allowed_mime_types @> array['video/mp4', 'video/quicktime', 'video/webm']
              and allowed_mime_types <@ array['video/mp4', 'video/quicktime', 'video/webm']
          ) then 0 else 1 end)::bigint

  -- Who may do what with the files ------------------------------------------
  union all
  select '04 all five video storage rules are there',
         count(*)
  from expected_video_rules e
  where not exists (
    select 1 from video_rules v where v.policyname = e.policyname and v.cmd = e.cmd
  )

  union all
  select '05 no extra rule opens the video bucket',
         count(*)
  from video_rules v
  where not exists (
    select 1 from expected_video_rules e where e.policyname = v.policyname and e.cmd = v.cmd
  )

  union all
  select '06 only logged-in people may change video files',
         count(*)
  from video_rules
  where cmd <> 'SELECT' and roles <> array['authenticated']::name[]

  union all
  select '07 travelers change only their own folder, admins are really checked',
         count(*)
  from video_rules
  where cmd <> 'SELECT'
    and case
      when policyname = 'admins can delete review videos' then qual not like '%is_admin()%'
      else (cmd in ('UPDATE', 'DELETE') and (qual not like '%foldername(name)%' or qual not like '%auth.uid()%'))
        or (cmd in ('INSERT', 'UPDATE') and (with_check not like '%foldername(name)%' or with_check not like '%auth.uid()%'))
    end

  union all
  select '08 no storage write rule applies to every bucket',
         count(*)
  from storage_rules
  where cmd <> 'SELECT' and qual not like '%bucket_id%' and with_check not like '%bucket_id%'

  -- A review's video must be its writer's own -------------------------------
  union all
  select '09 the own-video guard runs on every new or changed video',
         (case when exists (
            -- 23 = row (1) + before (2) + insert (4) + update (16)
            select 1 from video_trigger where (tgtype & 23) = 23 and tgenabled in ('O', 'A')
          ) then 0 else 1 end)::bigint

  union all
  select '10 the own-video guard compares the folder with the writer',
         (case when exists (
            select 1 from video_trigger
            where prosrc like '%split_part(new.video_path%'
              and prosrc like '%new.user_id%'
              and prosrc like '%(mp4|mov|webm)%'
              and coalesce(proconfig, '{}') @> array['search_path=""']
          ) then 0 else 1 end)::bigint

  union all
  select '11 travelers may set video_path, logged-out visitors may not',
         (case when has_column_privilege('authenticated', 'public.reviews', 'video_path', 'UPDATE')
                and not has_column_privilege('anon', 'public.reviews', 'video_path', 'INSERT')
                and not has_column_privilege('anon', 'public.reviews', 'video_path', 'UPDATE')
          then 0 else 1 end)::bigint

  -- The two admin functions --------------------------------------------------
  union all
  select '12 both admin media functions exist',
         2 - count(*)
  from admin_functions

  union all
  select '13 logged-out visitors cannot call them, logged-in calls reach their admin check',
         count(*)
  from admin_functions
  where has_function_privilege('anon', oid, 'EXECUTE')
     or not has_function_privilege('authenticated', oid, 'EXECUTE')

  union all
  select '14 both refuse anyone who is not an admin',
         count(*)
  from admin_functions
  where prosrc not like '%if not (select public.is_admin ())%'
     or prosrc not like '%42501%'

  union all
  select '15 both are read-only with a fixed search_path',
         count(*)
  from admin_functions
  where not prosecdef
     or provolatile <> 's'
     or not coalesce(proconfig, '{}') @> array['search_path=""']

  union all
  select '16 storage used reads sizes only, for all three buckets',
         count(*)
  from admin_functions
  where proname = 'admin_storage_used'
    and (prosrc not like '%place_photos%'
      or prosrc not like '%review_photos%'
      or prosrc not like '%review_videos%'
      or prosrc not like '%''total''%'
      or prosrc like '%o.name%')

  union all
  select '17 the Trash videos list shows only reviews in the Trash',
         count(*)
  from admin_functions
  where proname = 'admin_trashed_review_videos'
    and prosrc not like '%r.trashed_at is not null%'

  -- The saved reviews and files agree ---------------------------------------
  union all
  select '18 every saved video is in its writer''s folder, with a valid name',
         count(*)
  from saved_videos
  where video_path !~ '^[0-9a-f-]{36}/[0-9a-f-]{36}\.(mp4|mov|webm)$'
     or split_part(video_path, '/', 1) <> user_id::text

  union all
  select '19 no two reviews share one video file',
         count(*)
  from (
    select video_path from saved_videos group by video_path having count(*) > 1
  ) shared

  union all
  select '20 every review''s video file really exists',
         count(*)
  from saved_videos s
  where not exists (select 1 from video_files f where f.name = s.video_path)

  union all
  select '21 no forgotten video file is using up storage',
         count(*)
  from video_files f
  where f.created_at < now() - interval '24 hours'
    and not exists (select 1 from saved_videos s where s.video_path = f.name)

  union all
  select '22 every video file belongs to the traveler whose folder it is in',
         count(*)
  from video_files
  where owner_id is distinct from split_part(name, '/', 1)

  union all
  select '23 every stored video is up to 50 MB and an allowed type',
         count(*)
  from video_files
  where size is null
     or size > 52428800
     or mimetype is null
     or mimetype not in ('video/mp4', 'video/quicktime', 'video/webm')

  union all
  select '24 every stored photo is up to 2 MB and an allowed type',
         count(*)
  from photo_files
  where size is null
     or size > 2097152
     or mimetype is null
     or mimetype not in ('image/jpeg', 'image/png', 'image/webp')

  union all
  select '25 every .webp photo is really stored as WebP, and only those',
         count(*)
  from photo_files
  where (lower(name) like '%.webp') is distinct from (mimetype = 'image/webp')

  union all
  select '26 storage is under the 80 % warning (of the free 1 GB)',
         (case when coalesce(sum(size), 0) >= 0.8 * 1073741824 then 1 else 0 end)::bigint
  from files
)
select check_name,
       found,
       case when found = 0 then '✓ safe' else '✗ look at this' end as result
from checks
order by check_name;
