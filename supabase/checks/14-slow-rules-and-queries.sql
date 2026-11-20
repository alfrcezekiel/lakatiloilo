-- Check 14 — rules and queries that get slow as the app grows.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Not a security hole: SPEED ADVICE. Nothing here lets a stranger in. But
-- a slow rule runs on every row of every page, so it shows up in the k6
-- load test (L8) long before it hurts a traveler. These are the same
-- things Supabase's own "Performance Advisor" looks for.
--
-- Part A. Rules that ask "who is this?" once PER ROW.
-- Written as  auth.uid() = user_id  Postgres calls auth.uid() again for
-- every row it looks at. Written as  (select auth.uid()) = user_id  it
-- asks once per query and re-uses the answer. Same for is_admin().
-- (Postgres stores the wrapped form as "( SELECT auth.uid() AS uid)",
-- which is why the search below looks for "SELECT" in front.)
--
-- SAFE = "Success. No rows returned."
-- A row: re-create that policy with the call wrapped in (select …), in the
-- next supabase/sql/NNN file (use /sql-change). It behaves the same.

select schemaname as area,
       tablename,
       policyname,
       cmd as for_action,
       qual as using_rule,
       with_check as check_rule
from pg_policies
where schemaname in ('public', 'storage')
  and (
    coalesce(qual, '') ~* '(?<!SELECT )(auth\.uid|auth\.jwt|auth\.role|(public\.)?is_admin)\(\)'
    or coalesce(with_check, '') ~* '(?<!SELECT )(auth\.uid|auth\.jwt|auth\.role|(public\.)?is_admin)\(\)'
  )
order by area, tablename, policyname;

-- Part B (paste and run on its own): links between tables (foreign keys)
-- with no index. Deleting a review must find its likes, replies and
-- photos; without an index on review_id, Postgres reads the whole table
-- each time.
-- This is a list to judge, not a pass/fail. Links to auth.users (user_id)
-- matter less: accounts are rarely deleted. Links like review_id,
-- reply_id and parent_reply_id on a growing table are worth an index:
--   create index if not exists <table>_<column> on public.<table> (<column>);
--
-- select c.conrelid::regclass as table_name,
--        c.conname as link_name,
--        (select string_agg(a.attname, ', ' order by a.attnum)
--         from pg_attribute a
--         where a.attrelid = c.conrelid and a.attnum = any (c.conkey)) as columns,
--        c.confrelid::regclass as points_to
-- from pg_constraint c
-- where c.contype = 'f'
--   and c.connamespace = 'public'::regnamespace
--   and not exists (
--     select 1 from pg_index i
--     where i.indrelid = c.conrelid
--       and (string_to_array(i.indkey::text, ' ')::int2[])[1:cardinality(c.conkey)] @> c.conkey
--   )
-- order by 1, 2;
