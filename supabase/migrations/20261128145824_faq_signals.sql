-- A live doorbell for the FAQs (FAQs round, ticket 173: an open home page
-- or FAQs page shows the team's changes within a few seconds, without a
-- reload).
--
-- Why not listen to the faqs table itself: Supabase Realtime only tells a
-- visitor about a change they may still read afterwards. A visitor may
-- read only the shown questions, so hiding one would never reach them, and
-- the hidden question would stay on their screen. (The same reason as
-- review_visibility_signals, supabase/sql/041.)
--
-- What it adds: a tiny faq_signals table. Each time the faqs change (add,
-- edit, move, show, hide, delete), the database adds one row holding only
-- an id and a time: never the question, its answer or its topic. Anyone
-- may read these rows, so Realtime announces them to every open page, and
-- the page asks the backend again (the usual doorbell,
-- .claude/rules/frontend.md).
--
-- Safety: Row Level Security is on. Anyone may read; nobody may add,
-- change or delete rows through the app (only the trigger below adds
-- them). Rows older than a day are cleared as new ones arrive, so the
-- table stays tiny.

-- 1. The table -------------------------------------------------------------

create table public.faq_signals (
  id bigint generated always as identity primary key,
  created_at timestamptz not null default now()
);

comment on table public.faq_signals is
  'Live doorbell for the FAQs (ticket 173): one row per change to faqs, no content.';

-- 2. Who may touch it: read only ---------------------------------------------

revoke all on table public.faq_signals from anon, authenticated, lakat_api;
grant select on table public.faq_signals to anon, authenticated;

alter table public.faq_signals enable row level security;

create policy "anyone can read faq signals" on public.faq_signals
  for select
  to anon, authenticated
  using (true);

-- 3. Ring it when the faqs change ---------------------------------------------
--
-- Once per change (for each statement, not each row): a move updates two
-- rows but rings once. security definer: the admin making the change has
-- no write permission on this table, on purpose. search_path = '' and full
-- table names.

create or replace function public.signal_faqs_changed()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
  as $function$
begin
  delete from public.faq_signals where created_at < now() - interval '1 day';
  insert into public.faq_signals default values;
  return null;
end;
$function$;

revoke all on function public.signal_faqs_changed() from public, anon, authenticated;

create trigger signal_faqs_changed
  after insert or update or delete on public.faqs
  for each statement
  execute function public.signal_faqs_changed();

-- 4. Put it on the Realtime list -----------------------------------------------

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'faq_signals'
  ) then
    alter publication supabase_realtime add table public.faq_signals;
  end if;
end;
$$;

-- Check queries (run in the local database to see it worked):
-- select tablename from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'faq_signals';   -- 1 row
-- select policyname, roles, cmd from pg_policies where tablename = 'faq_signals';   -- 1 policy, SELECT
-- select relrowsecurity from pg_class where oid = 'public.faq_signals'::regclass;   -- true
-- The faqs table itself stays OFF the Realtime list:
-- select count(*) from pg_publication_tables where pubname = 'supabase_realtime' and tablename = 'faqs';   -- 0
