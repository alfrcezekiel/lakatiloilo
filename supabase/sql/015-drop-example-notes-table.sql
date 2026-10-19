-- Drop the `notes` table from the template example (001-example.sql).
--
-- The app never used it, but it was still live in Supabase with a policy
-- letting anyone on the internet INSERT rows through the public API (a
-- spam inbox nobody reads). The spec says no one may write through the
-- app, so it goes.
--
-- Checked before writing this file: the table had 0 rows, and no other
-- table, view or code referenced it. Dropping the table also removes its
-- two policies.
--
-- 001-example.sql stays in the repo as documentation of the RLS pattern;
-- running 001 and then this file leaves the database without `notes`.
--
-- Safe to run more than once.

drop table if exists public.notes;

-- Check: should list only accommodations and destinations.
select tablename, rowsecurity from pg_tables
where schemaname = 'public'
order by tablename;
