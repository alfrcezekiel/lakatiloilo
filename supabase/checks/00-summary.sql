-- Database safety checks — SUMMARY (layer 4 in docs/TESTING.md)
--
-- READ-ONLY: only SELECT. It changes nothing and is safe to run on the
-- hosted project at any time, as often as you like.
-- Run: Supabase -> SQL Editor -> New query -> paste this file -> Run.
--
-- One row per check. "✓ safe" means that check found nothing to worry
-- about. Anything else: open the numbered file (01-…, 02-…) to see which
-- tables or functions, and why it matters.
--
-- Expected: every row "✓ safe" (confirmed on the hosted project,
-- 2026-11-17).

select check_name,
       problems,
       case when problems = 0 then '✓ safe'
            else '✗ open ' || left(check_name, 2) || '-….sql for details' end as result
from (
  -- 01: every table in "public" has Row Level Security on.
  select '01 RLS is on for every table' as check_name,
         count(*) as problems
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and not c.relrowsecurity

  union all
  -- 02: tables with RLS but no policy at all (a feature would quietly
  -- show nothing).
  select '02 tables with RLS but no policy',
         count(*)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p') and c.relrowsecurity
    and not exists (select 1 from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname)

  union all
  -- 03: policies that let logged-out visitors write, or let anyone write
  -- anything ("true").
  select '03 open write policies',
         count(*)
  from pg_policies
  where schemaname = 'public'
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and (roles && array['anon', 'public']::name[]
         or coalesce(qual, '') = 'true' or coalesce(with_check, '') = 'true')

  union all
  -- 04: logged-out visitors (anon, or everyone = PUBLIC) allowed to write
  -- to a table at all. RLS would still stop them, but this is the second
  -- lock on the door.
  select '04 tables logged-out visitors may write to',
         count(distinct table_name)
  from information_schema.role_table_grants
  where table_schema = 'public' and grantee in ('anon', 'PUBLIC')
    and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')

  union all
  -- 05: functions that run with their owner's rights (security definer)
  -- without a fixed search_path.
  select '05 definer functions without a fixed search_path',
         count(*)
  from pg_proc p join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public' and p.prosecdef
    and not exists (select 1 from unnest(coalesce(p.proconfig, '{}')) s where s like 'search_path=%')

  union all
  -- 07: the backend's login (lakat_api) and the website's roles cannot
  -- skip Row Level Security.
  select '07 roles that skip RLS (lakat_api, anon, authenticated)',
         count(*)
  from pg_roles
  where rolname in ('lakat_api', 'anon', 'authenticated') and (rolbypassrls or rolsuper)
) as checks
order by check_name;

-- Then also run 06-storage-buckets.sql: its answer is a short list to
-- compare by eye, not a count.
