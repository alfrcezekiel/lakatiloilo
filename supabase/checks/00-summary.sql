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
-- Expected: every row "✓ safe" (rows 01–07 confirmed on the hosted
-- project, 2026-11-17; rows 08–12 added 2026-11-20, not yet run there).

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

  union all
  -- 08: private tables a logged-out visitor can read (a grant or a read
  -- rule). Keep this list the same as meant_public in 08-….sql.
  select '08 private tables logged-out visitors can read',
         count(distinct c.relname)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
    and c.relname not in ('destinations', 'accommodations', 'place_categories',
                          'reviews', 'review_replies', 'review_likes', 'reply_likes',
                          'review_photos', 'report_signals', 'review_visibility_signals',
                          'faqs', 'faq_signals')
    and (has_table_privilege('anon', c.oid, 'SELECT')
         or exists (select 1 from pg_policies p
                    where p.schemaname = 'public' and p.tablename = c.relname
                      and p.cmd in ('SELECT', 'ALL')
                      and p.roles && array['anon', 'public']::name[]))

  union all
  -- 09: write rules that never check who is asking (auth.uid() or
  -- is_admin()).
  select '09 write rules that never ask who is asking',
         count(*)
  from pg_policies
  where schemaname in ('public', 'storage')
    and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
    and coalesce(qual, '') !~* '(auth\.uid\(\)|is_admin\(\))'
    and coalesce(with_check, '') !~* '(auth\.uid\(\)|is_admin\(\))'

  union all
  -- 10: views that run with their owner's rights, so RLS is skipped.
  select '10 views that skip RLS',
         count(*)
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('v', 'm')
    and (c.relkind = 'm'
         or not exists (select 1 from unnest(coalesce(c.reloptions, '{}')) o
                        where o ~* '^security_invoker=(true|on|yes|1)$'))
    and (has_table_privilege('anon', c.oid, 'SELECT')
         or has_table_privilege('authenticated', c.oid, 'SELECT'))

  union all
  -- 11: lakat_api owns a table, writes directly, or belongs to a role
  -- other than "authenticated".
  select '11 hidden powers of the backend''s login (lakat_api)',
         (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
          where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
            and pg_get_userbyid(c.relowner) in ('lakat_api', 'anon', 'authenticated')
            and not c.relforcerowsecurity)
       + (select count(distinct table_name) from information_schema.role_table_grants
          where table_schema = 'public' and grantee = 'lakat_api'
            and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE'))
       + (select count(*) from pg_auth_members m
          join pg_roles r on r.oid = m.roleid join pg_roles u on u.oid = m.member
          where u.rolname = 'lakat_api' and r.rolname <> 'authenticated')

  union all
  -- 12: Realtime sends a table without RLS, a table the app does not
  -- listen to, or every table.
  select '12 Realtime tables that should not be sent',
         (select count(*) from pg_publication
          where pubname = 'supabase_realtime' and puballtables)
       + (select count(*) from pg_publication_tables pt
          join pg_namespace n on n.nspname = pt.schemaname
          join pg_class c on c.relname = pt.tablename and c.relnamespace = n.oid
          where pt.pubname = 'supabase_realtime'
            and (not c.relrowsecurity or pt.schemaname <> 'public'
                 or pt.tablename not in ('destinations', 'accommodations', 'reviews',
                                         'review_likes', 'review_replies', 'reply_likes',
                                         'notifications', 'review_visibility_signals',
                                         'review_photos', 'report_signals',
                                         'place_categories', 'faq_signals')))
) as checks
order by check_name;

-- 13-data-that-breaks-the-rules.sql: run it on its own. It counts saved
-- rows that break a rule; every count should be 0.
-- 14-slow-rules-and-queries.sql: speed advice, not a security check.

-- Then also run 06-storage-buckets.sql: its answer is a short list to
-- compare by eye, not a count.
