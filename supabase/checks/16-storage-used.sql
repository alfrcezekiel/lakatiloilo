-- Check 16 — the storage-used function is for admins only (ticket 167,
-- supabase/sql/067).
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- SAFE = "Success. No rows returned."
-- Each row names one thing that is wrong, in plain words.

with problems as (
  select 'The storage-used function (admin_storage_used, 067) is missing.' as problem
  where not exists (select 1 from pg_proc where proname = 'admin_storage_used')

  union all
  select 'Someone not logged in may call admin_storage_used.'
  where exists (select 1 from pg_proc where proname = 'admin_storage_used')
    and has_function_privilege('anon', 'public.admin_storage_used()', 'execute')

  union all
  -- It must refuse anyone who isn't an admin, inside the function itself
  -- (logged-in travelers may call it, so this check is what stops them).
  select 'admin_storage_used does not check is_admin(), so any logged-in traveler could read storage sizes.'
  from pg_proc
  where proname = 'admin_storage_used'
    and pg_get_functiondef(oid) not like '%is_admin%'

  union all
  select 'admin_storage_used is not security definer, so it would not be able to add up the files.'
  from pg_proc
  where proname = 'admin_storage_used' and not prosecdef
)
select problem from problems;
