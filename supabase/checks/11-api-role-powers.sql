-- Check 11 — the backend's login (lakat_api) has no hidden powers.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: the backend logs in as lakat_api (supabase/sql/016). It may READ
-- some tables directly, and it may WRITE only by switching to
-- "authenticated" as one traveler, so Row Level Security decides
-- (.claude/rules/backend.md). Check 07 proves it cannot skip RLS. This
-- check looks for the other ways around it:
--   - owns a table: the owner of a table skips its RLS (unless the table
--     says "force row level security"),
--   - may write to a table directly, without becoming a traveler,
--   - belongs to a role other than "authenticated" (for example postgres
--     or service_role), and so gets that role's rights.
-- It also looks at anon and authenticated owning tables, for the same
-- reason.
--
-- SAFE = "Success. No rows returned."
-- A row is a way around RLS: fix it with the next supabase/sql/NNN file
-- (use /sql-change), for example
--   alter table public.<table> owner to postgres;
--   revoke insert, update, delete on public.<table> from lakat_api;
--   revoke <role> from lakat_api;

select 'owns a table, so it skips that table''s RLS' as problem,
       pg_get_userbyid(c.relowner)::text as who,
       c.relname::text as what
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p', 'v', 'm')
  and pg_get_userbyid(c.relowner) in ('lakat_api', 'anon', 'authenticated')
  and not c.relforcerowsecurity

union all

select 'may write directly, without becoming a traveler',
       grantee::text,
       table_name::text || ': ' || string_agg(privilege_type, ', ' order by privilege_type)
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee = 'lakat_api'
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
group by grantee, table_name

union all

select 'belongs to another role, and gets its rights',
       'lakat_api',
       r.rolname::text
from pg_auth_members m
join pg_roles r on r.oid = m.roleid
join pg_roles u on u.oid = m.member
where u.rolname = 'lakat_api'
  and r.rolname <> 'authenticated'
order by 1, 2, 3;
