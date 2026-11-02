-- Live updates: let Supabase Realtime announce changes (live updates
-- round, ticket 89).
--
-- Supabase Realtime only announces changes to tables on its list (the
-- "supabase_realtime" publication). This adds the five tables whose
-- changes the website should notice without a reload:
--   destinations, accommodations, reviews, review_likes, review_replies.
--
-- The website uses Realtime only as a doorbell ("a row in this table
-- changed") and then asks the NestJS backend again; it never uses the rows
-- Realtime sends.
--
-- What does NOT change:
--   - Row Level Security stays on, with the same policies. Realtime only
--     tells a viewer about rows they may already read, and all five tables
--     are already readable by anyone (see 002, 004, 020, 024 and 025).
--   - review_reports is deliberately NOT added: nobody may read reports
--     through the app (026).
--   - No grants change. Nothing here touches the service_role.
--
-- Safe to run again: a table already on the list is skipped.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

do $$
declare
  t text;
begin
  -- Supabase projects come with this list; create it only if it is missing.
  if not exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    create publication supabase_realtime;
  end if;

  -- A fixed list of our own table names (no user input), each added once.
  foreach t in array array['destinations', 'accommodations', 'reviews', 'review_likes', 'review_replies'] loop
    if not exists (
      select 1
        from pg_publication_tables
       where pubname = 'supabase_realtime'
         and schemaname = 'public'
         and tablename = t
    ) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end;
$$;

-- Check it worked ----------------------------------------------------------
--
-- Should list exactly these five public tables (and NOT review_reports):
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and schemaname = 'public'
--    order by tablename;
-- Should be false (the list is not "every table", so reports stay off it):
--   select puballtables from pg_publication where pubname = 'supabase_realtime';
-- Row Level Security still on for all five (rowsecurity = true):
--   select relname, relrowsecurity as rowsecurity from pg_class
--    where relname in ('destinations', 'accommodations', 'reviews', 'review_likes', 'review_replies');
