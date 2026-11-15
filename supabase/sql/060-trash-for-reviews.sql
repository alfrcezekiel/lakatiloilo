-- A Trash for deleted reviews (admin extras round, ticket 147).
--
-- Until now an admin's Delete review (after its 8-second Undo) deleted the
-- review for good. Now it goes to the Trash for 30 days, where Restore
-- brings it back exactly as it was, with its replies, Helpful likes,
-- photos and reports. (Delete for good and the 30 days come in ticket 149.)
--
-- How: nothing is copied or removed. The review gets trashed_at (when it
-- went to the Trash) and trashed_by (which admin). Every rule that lets
-- someone read reviews now leaves trashed ones out, for everyone: the
-- public, the backend's own login, the review's writer, and admins too. So
-- every page and screen that lists reviews (place pages, ratings, profiles,
-- the dashboard's Reviews, Reports and Places) leaves them out without any
-- change. Only the Trash page sees them, through admin_trashed_reviews().
--
--   1. reviews: trashed_at and trashed_by.
--   2. The read rules: "and not in the Trash" on each.
--   3. One review per traveler per place, among reviews not in the Trash
--      (so a traveler can write a new one while the old waits there;
--      restoring it is then refused).
--   4. Functions, admins only (is_admin()): admin_trash_review,
--      admin_restore_review, admin_trashed_reviews. Each place page showing
--      the review hears of the change (review_visibility_signals, 041).
--
-- Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. When it went to the Trash, and who sent it --------------------------------

alter table public.reviews
  add column if not exists trashed_at timestamptz,
  add column if not exists trashed_by uuid references auth.users (id) on delete set null;

-- 2. Nobody reads a review in the Trash through the normal rules -----------------

drop policy if exists "anyone can read visible reviews" on public.reviews;
create policy "anyone can read visible reviews" on public.reviews for
select to anon using (hidden_at is null and trashed_at is null);

drop policy if exists "api can read visible reviews" on public.reviews;
create policy "api can read visible reviews" on public.reviews for
select to lakat_api using (hidden_at is null and trashed_at is null);

drop policy if exists "travelers can read visible and their own reviews" on public.reviews;
create policy "travelers can read visible and their own reviews" on public.reviews for
select to authenticated using (
    trashed_at is null
    and (hidden_at is null or (select auth.uid ()) = user_id or (select public.is_admin ()))
);

-- 3. One review per traveler per place, not counting the Trash --------------------

alter table public.reviews drop constraint if exists reviews_user_id_place_type_place_id_key;

create unique index if not exists reviews_one_per_traveler_and_place
    on public.reviews (user_id, place_type, place_id)
 where trashed_at is null;

-- 4. Trash, restore and list (admins only) -----------------------------------------

-- Moves a review to the Trash. Answers 'trashed', or null when there is no
-- such review (or it is in the Trash already).
create or replace function public.admin_trash_review(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  moved record;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete reviews.' using errcode = '42501';
  end if;
  update public.reviews
     set trashed_at = now(), trashed_by = auth.uid()
   where id = target and trashed_at is null
  returning place_type, place_id into moved;
  if moved.place_type is null then
    return null;
  end if;
  insert into public.review_visibility_signals (place_type, place_id)
  values (moved.place_type, moved.place_id);
  return 'trashed';
end;
$$;

-- Brings a review back from the Trash. Answers 'restored', or null when it
-- is not in the Trash. Refuses (23505) when its writer has since written a
-- new review of the same place.
create or replace function public.admin_restore_review(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_review record;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may restore reviews.' using errcode = '42501';
  end if;
  select id, user_id, place_type, place_id into found_review
    from public.reviews where id = target and trashed_at is not null for update;
  if found_review.id is null then
    return null;
  end if;
  if exists (select 1 from public.reviews
              where user_id = found_review.user_id and place_type = found_review.place_type
                and place_id = found_review.place_id and trashed_at is null) then
    raise exception 'Its writer has written a new review of this place since. Delete that one first, or keep this one in the Trash.'
      using errcode = '23505';
  end if;
  update public.reviews set trashed_at = null, trashed_by = null where id = target;
  insert into public.review_visibility_signals (place_type, place_id)
  values (found_review.place_type, found_review.place_id);
  return 'restored';
end;
$$;

-- What is in the Trash, newest first: enough to recognise each review.
create or replace function public.admin_trashed_reviews()
returns table (
  id uuid,
  place_type text,
  place_id uuid,
  place_name text,
  reviewer_name text,
  rating smallint,
  comment text,
  reply_count int,
  photo_count int,
  report_count int,
  trashed_at timestamptz,
  trashed_by_name text
)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may open the Trash.' using errcode = '42501';
  end if;
  return query
    select r.id, r.place_type, r.place_id,
           coalesce(d.name, a.name, 'A place that was deleted'),
           r.reviewer_name, r.rating::smallint, r.comment,
           (select count(*)::int from public.review_replies p where p.review_id = r.id),
           (select count(*)::int from public.review_photos ph where ph.review_id = r.id),
           (select count(*)::int from public.review_reports rr where rr.review_id = r.id),
           r.trashed_at,
           coalesce(nullif(btrim(left(u.raw_user_meta_data ->> 'display_name', 40)), ''), 'An admin')
      from public.reviews r
      left join public.destinations d on r.place_type = 'destination' and d.id = r.place_id
      left join public.accommodations a on r.place_type = 'accommodation' and a.id = r.place_id
      left join auth.users u on u.id = r.trashed_by
     where r.trashed_at is not null
     order by r.trashed_at desc;
end;
$$;

revoke all on function public.admin_trash_review(uuid) from public, anon;
revoke all on function public.admin_restore_review(uuid) from public, anon;
revoke all on function public.admin_trashed_reviews() from public, anon;
grant execute on function public.admin_trash_review(uuid) to authenticated;
grant execute on function public.admin_restore_review(uuid) to authenticated;
grant execute on function public.admin_trashed_reviews() to authenticated;

-- 5. Check it worked ------------------------------------------------------------
--
-- Should list the three functions:
--   select proname from pg_proc
--    where proname in ('admin_trash_review', 'admin_restore_review', 'admin_trashed_reviews');
--
-- Should list the new one-review-per-place rule:
--   select indexname from pg_indexes where indexname = 'reviews_one_per_traveler_and_place';
