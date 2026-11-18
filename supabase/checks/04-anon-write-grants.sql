-- Check 04 — tables logged-out visitors are allowed to write to.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: Supabase gives the logged-out role (anon) every right on a new
-- table by default. Row Level Security still stops them, but taking those
-- rights away is a second lock on the door. Every table in supabase/sql
-- does `revoke … from anon` and then grants back only `select`.
--
-- SAFE = "Success. No rows returned."
-- A row means a table where only RLS stands between a stranger and the
-- data: write the next supabase/sql/NNN file with
--   revoke insert, update, delete, truncate on public.<table> from anon;

select table_name,
       grantee as who,
       string_agg(privilege_type, ', ' order by privilege_type) as may
from information_schema.role_table_grants
where table_schema = 'public'
  and grantee in ('anon', 'PUBLIC')
  and privilege_type in ('INSERT', 'UPDATE', 'DELETE', 'TRUNCATE')
group by table_name, grantee
order by table_name;
