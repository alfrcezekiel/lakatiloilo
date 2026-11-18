-- Check 02 — tables with Row Level Security on, but no policy.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: RLS with no policy means NOBODY can use the table directly (only
-- functions that run with their owner's rights can). That is safe, but if
-- it was not meant, a feature quietly shows nothing.
--
-- SAFE = "Success. No rows returned." (confirmed on the hosted project,
-- 2026-11-17). Even admins and notifications have policies: people may
-- read their own admin row (supabase/sql/038) and their own
-- notifications (035). Any table here: check it was meant to be closed.

select c.relname as table_with_rls_but_no_policy
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and c.relrowsecurity
  and not exists (
    select 1 from pg_policies p
    where p.schemaname = 'public' and p.tablename = c.relname
  )
order by 1;
