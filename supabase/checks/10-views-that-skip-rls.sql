-- Check 10 — views that skip Row Level Security.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: a view is a saved query that looks like a table. By default a view
-- runs with its OWNER's rights (in Supabase, usually "postgres"), so it
-- ignores the Row Level Security of the tables it reads. A view over
-- reviews, notifications or admins would then show every row to anyone
-- who may read the view, even with RLS on (Supabase's own advisor calls
-- this "security definer view"). A materialized view is a stored copy of
-- the rows, and RLS never applies to it at all.
--
-- The app has no views today, so this guards the next one. A view is safe
-- when it is made with
--   create view public.<name> with (security_invoker = true) as …
-- so it runs as the person asking and RLS still decides.
--
-- SAFE = "Success. No rows returned."
-- A row: re-create the view with security_invoker = true, or
--   revoke select on public.<name> from anon, authenticated;
-- in the next supabase/sql/NNN file (use /sql-change).

select n.nspname as schema,
       c.relname as view_name,
       case c.relkind when 'v' then 'view' else 'materialized view' end as kind,
       has_table_privilege('anon', c.oid, 'SELECT') as visitors_can_read,
       has_table_privilege('authenticated', c.oid, 'SELECT') as travelers_can_read
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('v', 'm')
  and (
    c.relkind = 'm'
    or not exists (
      select 1 from unnest(coalesce(c.reloptions, '{}')) o
      where o ~* '^security_invoker=(true|on|yes|1)$'
    )
  )
  and (has_table_privilege('anon', c.oid, 'SELECT')
       or has_table_privilege('authenticated', c.oid, 'SELECT'))
order by 1, 2;
