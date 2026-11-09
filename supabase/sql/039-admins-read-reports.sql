-- Admins may read reports (admin dashboard & moderation round, ticket
-- 108: the Reports screen).
--
-- Until now nobody could read review_reports through the app (026); the
-- team read them in the Supabase dashboard. From now on admins (the
-- admins table, 038) may read them, so the dashboard's Reports screen can
-- list them. Everyone else still cannot read a single report.
--
-- Safety:
--   - Row Level Security stays on. The new read policy only lets a row
--     through when is_admin() (038) says the person asking is an admin.
--   - Admins may read the reason, the note, the review and the date, but
--     not WHO reported it (user_id is left out of the grant), so the
--     Reports screen can never show or leak a reporter.
--   - Nobody gets new write permissions here. (Ticket 109 lets admins
--     delete reports for "Keep it".)
--   - review_reports stays off the Realtime list (029), so nobody is told
--     about new reports as they arrive.
--   - Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. What logged-in people may read at all ------------------------------
--
-- Only these columns, never user_id. Row Level Security below then lets
-- only admins see any rows.

grant select (id, review_id, reason, note, created_at)
    on public.review_reports to authenticated;

-- 2. Row Level Security -------------------------------------------------

drop policy if exists "admins can read reports" on public.review_reports;

create policy "admins can read reports" on public.review_reports for
select
    to authenticated
    using ((select public.is_admin ()));

-- 3. Check it worked ----------------------------------------------------
--
-- Should list two policies: the old insert policy (travelers can report
-- other travelers' reviews, INSERT) and the new one (admins can read
-- reports, SELECT):
--   select policyname, cmd, roles from pg_policies where tablename = 'review_reports';
--
-- Should show no row for review_reports (it stays off the Realtime list):
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and tablename = 'review_reports';
