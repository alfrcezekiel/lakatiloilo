-- Check 06 — the photo buckets (Supabase Storage).
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Not a pass/fail: compare the answer with EXPECTED below.
--
-- EXPECTED (supabase/sql, 2026-11-17): exactly two buckets, both
--   public = true            (anyone may LOOK at a photo, as on the site)
--   file_size_limit = 2097152 (2 MB, the limit the website explains)
--   allowed_mime_types = {image/jpeg,image/png,image/webp}
--     review-photos
--     place-photos
-- A bucket with no size limit or no type list accepts any file of any
-- size: fix it with the next supabase/sql/NNN file.

select id as bucket,
       public as anyone_can_view,
       file_size_limit,
       allowed_mime_types
from storage.buckets
order by id;

-- Second part (paste and run on its own): who may ADD, CHANGE or DELETE
-- files. Every row should be for `authenticated` (a logged-in traveler or
-- admin) and check who is asking, never `anon` or `public`.
--
-- select policyname, cmd as allows, roles as for_who, qual as using_rule, with_check as check_rule
-- from pg_policies
-- where schemaname = 'storage' and tablename = 'objects' and cmd <> 'SELECT'
-- order by policyname;
