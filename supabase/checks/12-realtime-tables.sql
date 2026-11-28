-- Check 12 — tables sent live to open pages (Supabase Realtime).
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: Realtime pushes every change of a "published" table to the pages
-- that listen. It follows Row Level Security, so a table must have RLS on
-- before it is published, and only the tables the app listens to should
-- be published at all. Publishing "all tables" would also publish every
-- table added later.
--
-- Expected published tables (12), and the file that added each:
--   029: destinations, accommodations, reviews, review_likes,
--        review_replies
--   032: reply_likes          035: notifications
--   041: review_visibility_signals          044: review_photos
--   045: report_signals       047: place_categories
--   migrations/…_faq_signals.sql: faq_signals (the faqs table itself is
--   NOT published: a hidden question could not be announced to visitors)
-- A new file that adds one must add it to the list below and in
-- 00-summary.sql.
--
-- SAFE = "Success. No rows returned."
-- A row: remove the table from the publication, or turn RLS on, in the
-- next supabase/sql/NNN file (use /sql-change):
--   alter publication supabase_realtime drop table public.<table>;

select 'the publication sends EVERY table, including new ones' as problem,
       pubname::text as what
from pg_publication
where pubname = 'supabase_realtime' and puballtables

union all

select case when not c.relrowsecurity
            then 'published WITHOUT Row Level Security'
            else 'published, but the app does not listen to it' end,
       pt.schemaname || '.' || pt.tablename
from pg_publication_tables pt
join pg_namespace n on n.nspname = pt.schemaname
join pg_class c on c.relname = pt.tablename and c.relnamespace = n.oid
where pt.pubname = 'supabase_realtime'
  and (
    not c.relrowsecurity
    or pt.schemaname <> 'public'
    or pt.tablename not in (
      'destinations', 'accommodations', 'reviews', 'review_likes',
      'review_replies', 'reply_likes', 'notifications',
      'review_visibility_signals', 'review_photos', 'report_signals',
      'place_categories', 'faq_signals'
    )
  )
order by 1, 2;
