-- Check 08 — private tables a logged-out visitor can read.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: checks 03 and 04 look at WRITING. This one looks at READING. Some
-- tables must never be readable by a stranger with the publishable key
-- (which every visitor's browser has): who is an admin, who reported
-- which review, a traveler's notifications, hidden and trashed reply
-- texts, photo credits and the place photo list (read through the
-- backend only).
--
-- How: a table is listed here when it is NOT on the "meant to be public"
-- list below AND a logged-out visitor (anon, or everyone = PUBLIC) has
--   - a read permission (grant) on it, or
--   - a read rule (policy) that applies to them.
-- A new table someone forgot to close also shows up here.
--
-- SAFE = "Success. No rows returned."
-- A row: write the next supabase/sql/NNN file (use /sql-change) with
--   revoke select on public.<table> from anon;
--   drop policy "<policy>" on public.<table>;
-- If the table really is meant to be public, add it to meant_public below
-- (and in 00-summary.sql), and say why in the commit.

with meant_public (table_name) as (
  values
    ('destinations'),
    ('accommodations'),
    ('place_categories'),
    ('reviews'),
    ('review_replies'),
    ('review_likes'),
    ('reply_likes'),
    ('review_photos'),
    ('report_signals'),
    ('review_visibility_signals'),
    -- FAQs round (tickets 168, 173): visitors read the SHOWN questions
    -- only (policy "anyone can read shown faqs"; hidden ones are for
    -- admins), and the faq_signals doorbell holds only an id and a time.
    ('faqs'),
    ('faq_signals')
),
public_tables as (
  select c.oid, c.relname::text as table_name
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind in ('r', 'p', 'v', 'm')
)
select t.table_name,
       'read permission (grant) for logged-out visitors' as how,
       null::text as policy_name
from public_tables t
where has_table_privilege('anon', t.oid, 'SELECT')
  and t.table_name not in (select table_name from meant_public)

union all

select p.tablename::text,
       'read rule (policy) for logged-out visitors',
       p.policyname::text
from pg_policies p
where p.schemaname = 'public'
  and p.cmd in ('SELECT', 'ALL')
  and p.roles && array['anon', 'public']::name[]
  and p.tablename::text not in (select table_name from meant_public)
order by 1, 2;

-- Part B (paste and run on its own): columns with private-sounding names
-- that a logged-out visitor can read, even in the public tables.
-- SAFE = "Success. No rows returned."
-- Public on purpose, so not listed: a hotel's front-desk email
-- (accommodations.email). The accommodation page shows it with an "Email
-- the front desk" button (docs/SPEC.md, accommodation detail page), like
-- the phone number. It is the business's address, never a traveler's.
-- (First run on the hosted project, 2026-11-20: it was the only row.)
--
-- select c.relname as table_name, a.attname as column_name
-- from pg_attribute a
-- join pg_class c on c.oid = a.attrelid
-- join pg_namespace n on n.oid = c.relnamespace
-- where n.nspname = 'public'
--   and c.relkind in ('r', 'p', 'v', 'm')
--   and a.attnum > 0 and not a.attisdropped
--   and a.attname ~* '(email|password|passwd|token|secret|ip_address|birth)'
--   and (c.relname, a.attname) not in (('accommodations', 'email'))
--   and has_column_privilege('anon', c.oid, a.attnum, 'SELECT')
-- order by 1, 2;
