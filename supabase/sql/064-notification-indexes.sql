-- Adds two indexes to notifications, so deleting a review or a reply stays
-- fast as the app grows (database check 14, Part B, run on 2026-11-20).
--
-- Why: every notification points at a review (review_id) and, except
-- Helpful-on-a-review, at a reply (reply_id). Both links say "on delete
-- cascade" (035): when a review or a reply is deleted, its notifications
-- go too. To find them, Postgres needs an index on those columns. Without
-- one it reads every notification, every time, for every deleted review,
-- reply, or answer under it. The table already has an index for "my
-- notifications" (user_id, 035) and "who did it" (actor_id, 036), but not
-- for these two.
--
-- What changes for travelers: nothing they can see. No rows, rules,
-- permissions or Row Level Security change. Nothing here uses the
-- service_role key.
--
-- Safe to run more than once ("if not exists"). On a small table it takes
-- well under a second.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

create index if not exists notifications_review_idx
  on public.notifications (review_id);

create index if not exists notifications_reply_idx
  on public.notifications (reply_id);

-- Check it worked ----------------------------------------------------------------
--
-- Should list four indexes: notifications_actor_idx, notifications_reply_idx,
-- notifications_review_idx and notifications_user_idx (plus the primary key):
--   select indexname from pg_indexes
--   where schemaname = 'public' and tablename = 'notifications'
--   order by indexname;
--
-- Then re-run Part B of supabase/checks/14-slow-rules-and-queries.sql:
-- notifications_reply_id_fkey and notifications_review_id_fkey should be
-- gone from the list (11 rows instead of 13).
