-- Check 09 — write rules that never ask "who is this?".
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: check 03 catches write rules that are open to logged-out visitors
-- or that are just `true`. This one catches the quieter mistake: a rule
-- for logged-in travelers that never checks WHICH traveler. For example
--   using (hidden_at is null)
-- would let any logged-in traveler change or delete anybody's review.
-- Every write rule here must check the person asking, with auth.uid()
-- ("this is my row") or is_admin() ("I am on the team").
--
-- Looks at the app's tables (public) and the photo files (storage).
--
-- SAFE = "Success. No rows returned."
-- A row: read using_rule and check_rule. If neither names the person
-- asking, fix it at once with the next supabase/sql/NNN file (use
-- /sql-change), adding for example `(select auth.uid()) = user_id`.

select schemaname as area,
       tablename,
       policyname,
       cmd as allows,
       roles as for_who,
       qual as using_rule,
       with_check as check_rule
from pg_policies
where schemaname in ('public', 'storage')
  and cmd in ('INSERT', 'UPDATE', 'DELETE', 'ALL')
  and coalesce(qual, '') !~* '(auth\.uid\(\)|is_admin\(\))'
  and coalesce(with_check, '') !~* '(auth\.uid\(\)|is_admin\(\))'
order by area, tablename, policyname;

-- Part B (paste and run on its own): UPDATE rules that check the person
-- before the change (using) but let them hand the row to someone else
-- after it (with check that does not name the person).
-- SAFE = "Success. No rows returned."
-- (When with check is empty, Postgres re-uses the using rule, which is
-- safe, so those are not listed.)
--
-- select schemaname as area, tablename, policyname,
--        qual as using_rule, with_check as check_rule
-- from pg_policies
-- where schemaname in ('public', 'storage')
--   and cmd in ('UPDATE', 'ALL')
--   and with_check is not null
--   and with_check !~* '(auth\.uid\(\)|is_admin\(\))'
-- order by area, tablename, policyname;
