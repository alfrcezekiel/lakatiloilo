-- Removes admin_delete_reply, which nothing uses any more (code review of
-- the admin extras round, 2026-11-15).
--
-- 052 added admin_delete_reply for the dashboard's Delete reply. Since
-- ticket 148 that button sends the reply to the Trash (admin_trash_reply,
-- 061), and Delete for good in the Trash uses delete_trashed_reply (062).
-- So the "a reply with answers stays as 'This reply was deleted'" rule was
-- written three times; dropping the unused copy leaves two: a traveler's
-- own (delete_own_reply, 034) and the Trash's (062). Nothing calls
-- admin_delete_reply (searched in the backend, the website and every SQL
-- file). Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

drop function if exists public.admin_delete_reply(uuid);

-- Check it worked ----------------------------------------------------------------
--
-- Should return no rows:
--   select proname from pg_proc where proname = 'admin_delete_reply';
