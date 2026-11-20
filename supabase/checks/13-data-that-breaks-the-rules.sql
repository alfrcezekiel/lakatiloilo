-- Check 13 — saved rows that break the app's own rules.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: checks 01–12 look at the RULES. This one looks at the ROWS. If a
-- rule was missing for a while, or a row was added by hand in the Table
-- Editor, bad rows stay behind even after the rule is fixed. Each line
-- counts the rows that break one rule the app promises in docs/SPEC.md and
-- supabase/sql. It only counts, so no traveler's text is shown.
--
-- The SQL Editor runs as the project owner, so it sees every row (RLS
-- does not hide any rows from it). That is what we want here.
--
-- SAFE = every row says 0 in "bad_rows".
-- A number above 0: ask your agent to show you which rows (an id list),
-- then decide together whether to fix or delete them, in the next
-- supabase/sql/NNN file. Then find out how they got in: that is the real
-- bug.

select rule, bad_rows
from (
  select 1 as n,
         'a review is about a place that exists' as rule,
         count(*) as bad_rows
  from public.reviews r
  where (r.place_type = 'destination'
         and not exists (select 1 from public.destinations d where d.id = r.place_id))
     or (r.place_type = 'accommodation'
         and not exists (select 1 from public.accommodations a where a.id = r.place_id))

  union all
  select 2, 'nobody marks their own review Helpful', count(*)
  from public.review_likes l
  join public.reviews r on r.id = l.review_id
  where l.user_id = r.user_id

  union all
  select 3, 'nobody marks their own reply Helpful', count(*)
  from public.reply_likes l
  join public.review_replies p on p.id = l.reply_id
  where l.user_id = p.user_id

  union all
  select 4, 'nobody reports their own review', count(*)
  from public.review_reports rr
  join public.reviews r on r.id = rr.review_id
  where rr.user_id = r.user_id

  union all
  select 5, 'an answer to a reply stays under the same review', count(*)
  from public.review_replies child
  join public.review_replies parent on parent.id = child.parent_reply_id
  where child.review_id <> parent.review_id

  union all
  select 6, 'a review photo is in its writer''s own folder', count(*)
  from public.review_photos ph
  join public.reviews r on r.id = ph.review_id
  where split_part(ph.photo_path, '/', 1) <> r.user_id::text

  union all
  select 7, 'a place photo belongs to a place that exists', count(*)
  from public.place_photos ph
  where (ph.place_type = 'destination'
         and not exists (select 1 from public.destinations d where d.id = ph.place_id))
     or (ph.place_type = 'accommodation'
         and not exists (select 1 from public.accommodations a where a.id = ph.place_id))

  union all
  select 8, 'photo credits belong to a place that exists', count(*)
  from public.place_photo_credits pc
  where (pc.place_type = 'destination'
         and not exists (select 1 from public.destinations d where d.id = pc.place_id))
     or (pc.place_type = 'accommodation'
         and not exists (select 1 from public.accommodations a where a.id = pc.place_id))

  -- Notifications (035, 036, 037). There are four kinds, and reply_id means
  -- something different in each: for review_reply and reply_answer it is
  -- the NEW reply (written by the person answering); for reply_like it is
  -- the reply that was liked (written by the person told).
  union all
  select 9, 'nobody is told about their own action', count(*)
  from public.notifications nt
  where nt.user_id = nt.actor_id

  union all
  select 10, 'a reply or answer notification never goes to the person who wrote it', count(*)
  from public.notifications nt
  join public.review_replies p on p.id = nt.reply_id
  where nt.kind in ('review_reply', 'reply_answer')
    and nt.user_id = p.user_id

  union all
  select 11, 'a Helpful-on-a-reply notification goes to that reply''s writer', count(*)
  from public.notifications nt
  join public.review_replies p on p.id = nt.reply_id
  where nt.kind = 'reply_like'
    and nt.user_id <> p.user_id

  union all
  select 12, 'a Helpful-on-a-review notification goes to that review''s writer', count(*)
  from public.notifications nt
  join public.reviews r on r.id = nt.review_id
  where nt.kind = 'review_like'
    and nt.user_id <> r.user_id
) as rules
order by n;
