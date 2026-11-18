-- Check 03 — policies that let anyone write.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: a policy is the rule RLS follows. A policy that adds, changes or
-- deletes rows must never apply to logged-out visitors (anon, or PUBLIC =
-- everyone), and must never be just `true` ("anyone, any row"). Writes go
-- through the backend as the logged-in traveler, so each write policy
-- should check who is asking (for example `auth.uid() = user_id`).
--
-- SAFE = "Success. No rows returned."
-- (The starter's "anyone can add a note" policy was like this; its notes
-- table was dropped in supabase/sql, so it should not appear.)

select tablename,
       policyname,
       cmd as allows,
       roles as for_who,
       qual as using_rule,
       with_check as check_rule
from pg_policies
where schemaname = 'public'
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and (
    roles && array['anon', 'public']::name[]
    or coalesce(qual, '') = 'true'
    or coalesce(with_check, '') = 'true'
  )
order by tablename, policyname;
