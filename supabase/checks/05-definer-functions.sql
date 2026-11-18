-- Check 05 — functions that run with their owner's rights.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: a "security definer" function runs as the role that owns it, not
-- the person calling it, so it can skip Row Level Security. That is how
-- admins, notifications and Trash work here. Each one must fix its
-- search_path (where Postgres looks for table names), or a caller could
-- make it use a look-alike table of their own.
--
-- Part A. SAFE = "Success. No rows returned."
-- (On 2026-11-17 all 72 definer functions in supabase/sql set it.)

select p.proname as function_name,
       pg_get_function_identity_arguments(p.oid) as arguments
from pg_proc p
join pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and not exists (
    select 1 from unnest(coalesce(p.proconfig, '{}')) s where s like 'search_path=%'
  )
order by 1;

-- Part B (paste and run on its own): owner's-rights functions a
-- LOGGED-OUT visitor could call directly.
-- Trigger functions (they run by themselves when a row is saved) are left
-- out: Postgres refuses to run one if someone calls it directly.
-- SAFE = "Success. No rows returned." Each row would need to check,
-- inside the function, who is asking (is_admin() or auth.uid()), or be
-- harmless to call. (On 2026-11-17, 8 trigger functions were callable
-- in name only, plus rls_auto_enable: see Part C.)
--
-- select p.proname as callable_by_logged_out_visitors,
--        pg_get_function_identity_arguments(p.oid) as arguments,
--        pg_get_function_result(p.oid) as returns
-- from pg_proc p
-- join pg_namespace n on n.oid = p.pronamespace
-- where n.nspname = 'public'
--   and p.prosecdef
--   and has_function_privilege('anon', p.oid, 'execute')
--   and p.prorettype not in ('trigger'::regtype, 'event_trigger'::regtype)
-- order by 1;

-- Part C (paste and run on its own): rls_auto_enable is not in
-- supabase/sql. This shows what it returns, who owns it, its description,
-- and whether an event trigger uses it.
-- Result on the hosted project (2026-11-17): returns event_trigger, owned
-- by postgres, used by the event trigger "ensure_rls on ddl_command_end".
-- So after every table change it runs by itself to switch Row Level
-- Security on for new tables: a safety net, added outside supabase/sql
-- (probably a Supabase project setting). Like a trigger function, it
-- cannot be called directly by a visitor.
--
-- select p.proname, pg_get_function_result(p.oid) as returns,
--        p.proowner::regrole as owner, obj_description(p.oid) as description,
--        (select string_agg(e.evtname || ' on ' || e.evtevent, ', ')
--           from pg_event_trigger e where e.evtfoid = p.oid) as used_by_event_trigger
-- from pg_proc p
-- where p.proname = 'rls_auto_enable';
