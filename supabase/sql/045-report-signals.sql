-- A live doorbell for the admin dashboard's Overview (admin dashboard &
-- moderation round; team request 2026-11-09: "the Overview should update
-- by itself, without a reload, using Supabase Realtime").
--
-- The Overview counts reviews, reports and hidden reviews. Reviews and
-- hiding are already announced by Realtime (029, 041). Reports are not:
-- nobody but admins may read them, and review_reports stays OFF the
-- Realtime list (026, 029, 039).
--
-- So reports get their own tiny signal table, like 041: whenever reports
-- are added or removed (a traveler reports, Keep it, Delete review), the
-- database adds one row holding ONLY a time. No review, no place, no
-- reason, no note and no reporter. The Overview listens to it and then asks
-- the backend again, which checks that the person is an admin.
--
-- Safety: Row Level Security is on. Anyone may read the times (they say
-- only "reports changed at this moment"); nobody may add, change or delete
-- rows through the app; only the trigger below adds them, once per change
-- (not once per report). Rows older than a day are cleared as new ones
-- arrive. review_reports itself stays off the Realtime list. Nothing here
-- uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ----------------------------------------------------------

create table if not exists public.report_signals (
    id bigint generated always as identity primary key,
    created_at timestamptz not null default now()
);

-- 2. Who may touch it: read only ------------------------------------------

revoke all on public.report_signals from anon, authenticated;
grant select on public.report_signals to anon, authenticated;

alter table public.report_signals enable row level security;

drop policy if exists "anyone can read report signals" on public.report_signals;

create policy "anyone can read report signals" on public.report_signals for
select to anon, authenticated using (true);

-- 3. Ring it when reports are added or removed ------------------------------
--
-- "for each statement": one signal per change, even when Keep it removes
-- several reports at once. security definer: travelers and admins have no
-- write permission on this table, on purpose.

create or replace function public.signal_reports_changed()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.report_signals where created_at < now() - interval '1 day';
  insert into public.report_signals default values;
  return null;
end;
$$;

revoke all on function public.signal_reports_changed() from public, anon, authenticated;

drop trigger if exists signal_reports_changed on public.review_reports;

create trigger signal_reports_changed
  after insert or delete on public.review_reports
  for each statement execute function public.signal_reports_changed();

-- 4. Put it on the Realtime list ---------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public'
       and tablename = 'report_signals'
  ) then
    alter publication supabase_realtime add table public.report_signals;
  end if;
end;
$$;

-- 5. Check it worked ----------------------------------------------------------
--
-- Should list report_signals, and still NOT review_reports:
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and schemaname = 'public' order by 1;
--
-- Should list the new trigger on review_reports:
--   select tgname from pg_trigger
--    where tgrelid = 'public.review_reports'::regclass and not tgisinternal;
