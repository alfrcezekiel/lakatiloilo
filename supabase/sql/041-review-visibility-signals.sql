-- A live doorbell for hiding and showing reviews (admin dashboard &
-- moderation round, ticket 109; team report 2026-11-08: "when I hide a
-- review, an open page in another browser keeps showing it until I
-- reload").
--
-- Why it happened: the website listens to Supabase Realtime for changes in
-- reviews (029), but Realtime only announces a change to people who may
-- still read the row afterwards. Once a review is hidden, nobody but its
-- writer and the team may read it (040), so open pages were never told.
--
-- The fix: a tiny signal table. Whenever a review is hidden or shown
-- again, the database adds one row saying only WHICH PLACE changed (never
-- the review, its text or who wrote it). Anyone may read these rows, so
-- Realtime announces them to every open page, and the page asks the
-- backend again (the usual doorbell, .claude/rules/frontend.md).
--
-- Safety: Row Level Security is on. Anyone may read; nobody may add,
-- change or delete rows through the app (only the trigger below adds
-- them). Rows older than a day are cleared as new ones arrive, so the
-- table stays tiny. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ----------------------------------------------------------

create table if not exists public.review_visibility_signals (
    id bigint generated always as identity primary key,
    place_type text not null check (place_type in ('destination', 'accommodation')),
    place_id uuid not null,
    created_at timestamptz not null default now()
);

-- 2. Who may touch it: read only ------------------------------------------

revoke all on public.review_visibility_signals from anon, authenticated;
grant select on public.review_visibility_signals to anon, authenticated;

alter table public.review_visibility_signals enable row level security;

drop policy if exists "anyone can read visibility signals" on public.review_visibility_signals;

create policy "anyone can read visibility signals" on public.review_visibility_signals for
select to anon, authenticated using (true);

-- 3. Ring it when a review is hidden or shown again -------------------------
--
-- security definer: the person hiding (an admin) has no write permission on
-- this table, on purpose. search_path = '' and full table names.

create or replace function public.signal_review_visibility()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.hidden_at is distinct from old.hidden_at then
    delete from public.review_visibility_signals
     where created_at < now() - interval '1 day';
    insert into public.review_visibility_signals (place_type, place_id)
    values (new.place_type, new.place_id);
  end if;
  return null;
end;
$$;

revoke all on function public.signal_review_visibility() from public, anon, authenticated;

drop trigger if exists signal_review_visibility on public.reviews;

create trigger signal_review_visibility
  after update of hidden_at on public.reviews
  for each row execute function public.signal_review_visibility();

-- 4. Put it on the Realtime list ---------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'review_visibility_signals'
  ) then
    alter publication supabase_realtime add table public.review_visibility_signals;
  end if;
end;
$$;

-- 5. Check it worked ----------------------------------------------------------
--
-- Should list review_visibility_signals next to the five tables from 029
-- (and still NOT review_reports):
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and schemaname = 'public'
--    order by tablename;
--
-- Should list one policy, "anyone can read visibility signals" (SELECT):
--   select policyname, cmd, roles from pg_policies
--    where tablename = 'review_visibility_signals';
