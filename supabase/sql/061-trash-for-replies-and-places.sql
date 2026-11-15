-- Replies and places go to the Trash too (admin extras round, ticket 148).
--
-- 060 gave deleted reviews a Trash. Now an admin's Delete reply and
-- Delete place (after their 8-second Undo) also send them there for 30
-- days, and Restore brings them back. (Delete for good and the 30 days
-- come in ticket 149.)
--
-- A reply in the Trash:
--   - stays in its thread as "This reply was deleted", so the answers
--     under it stay where they were. Its text, name, tag and writer move
--     into trashed_reply_texts, which only admins may read (like a hidden
--     reply's text, 056), so nobody can read it through the site's public
--     key while it waits;
--   - keeps its Helpful likes (they come back with it). Its notifications
--     are removed, as when it was deleted before (052), and do not come
--     back;
--   - cannot be edited, marked Helpful, answered, hidden or shown;
--   - Restore puts it back as it was. It is refused, with a plain
--     message, while its review is in the Trash.
--
-- A place in the Trash:
--   - gets trashed_at and trashed_by, like a review (060). The read rules
--     leave it out for everyone, admins too, so the home page, search, the
--     map, the credits page and every dashboard screen leave it out with
--     no other change. Admins cannot edit it while it waits;
--   - its reviews go to the Trash with it (trashed_with_place), so they
--     leave profiles and the dashboard too, each with its replies, likes,
--     photos and reports; its photos and their credits stay where they
--     are. Nobody can write a new review of it;
--   - Restore brings it back with those reviews. A review that was in the
--     Trash on its own before the place went stays there, on its own.
--
-- Functions, admins only (is_admin()): admin_trash_reply,
-- admin_restore_reply, admin_trashed_replies, admin_trash_place,
-- admin_restore_place, admin_trashed_places. admin_restore_review and
-- admin_trashed_reviews (060) are replaced so they know about places in
-- the Trash. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Replies: when they went to the Trash, and who sent them ------------------

alter table public.review_replies
  add column if not exists trashed_at timestamptz,
  add column if not exists trashed_by uuid references auth.users (id) on delete set null;

-- A reply in the Trash has an empty text, like a deleted or hidden one.
alter table public.review_replies
  drop constraint if exists review_replies_comment_check;
alter table public.review_replies
  add constraint review_replies_comment_check check (
    deleted_at is not null
    or hidden_at is not null
    or trashed_at is not null
    or char_length(btrim(comment)) between 1 and 300
  );

-- Where a reply's text, name, tag and writer wait while it is in the Trash.
create table if not exists public.trashed_reply_texts (
    reply_id uuid primary key references public.review_replies (id) on delete cascade,
    comment text not null,
    replier_name text not null,
    traveler_type text,
    user_id uuid references auth.users (id) on delete set null
);

revoke all on public.trashed_reply_texts from anon, authenticated;
grant select on public.trashed_reply_texts to authenticated;

alter table public.trashed_reply_texts enable row level security;

drop policy if exists "admins can read trashed reply texts" on public.trashed_reply_texts;
create policy "admins can read trashed reply texts" on public.trashed_reply_texts for
select to authenticated using ((select public.is_admin ()));

-- Going to the Trash, or coming back, never marks a reply "edited" (the
-- same as 056, plus trashed_at).
create or replace function public.review_replies_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.hidden_at is distinct from old.hidden_at
     or new.trashed_at is distinct from old.trashed_at then
    new.updated_at := old.updated_at;
  elsif new.comment is distinct from old.comment then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

-- A reply in the Trash cannot be answered (55000, which the backend
-- already turns into "That reply was deleted, so it can't be answered.").
-- Editing it and marking it Helpful are refused already: its writer is
-- emptied while it waits, and those rules need the writer (034, 056).
create or replace function public.review_replies_parent_not_in_trash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.parent_reply_id is not null
     and exists (select 1 from public.review_replies p
                  where p.id = new.parent_reply_id and p.trashed_at is not null) then
    raise exception 'That reply was deleted, so it can''t be answered.' using errcode = '55000';
  end if;
  return new;
end;
$$;

revoke all on function public.review_replies_parent_not_in_trash() from public, anon;

drop trigger if exists review_replies_parent_not_in_trash on public.review_replies;
create trigger review_replies_parent_not_in_trash
  before insert on public.review_replies
  for each row execute function public.review_replies_parent_not_in_trash();

-- A reply in the Trash cannot be hidden or shown (Hide it / Show it, 056).
create or replace function public.review_replies_keep_trashed_as_is()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if old.trashed_at is not null and new.trashed_at is not null
     and new.hidden_at is distinct from old.hidden_at then
    raise exception 'That reply is in the Trash. Restore it first.' using errcode = '55000';
  end if;
  return new;
end;
$$;

drop trigger if exists review_replies_keep_trashed_as_is on public.review_replies;
create trigger review_replies_keep_trashed_as_is
  before update of hidden_at on public.review_replies
  for each row execute function public.review_replies_keep_trashed_as_is();

-- 2. Places: when they went to the Trash, and who sent them -------------------

alter table public.destinations
  add column if not exists trashed_at timestamptz,
  add column if not exists trashed_by uuid references auth.users (id) on delete set null;

alter table public.accommodations
  add column if not exists trashed_at timestamptz,
  add column if not exists trashed_by uuid references auth.users (id) on delete set null;

-- A review that went to the Trash with its place (and comes back with it).
alter table public.reviews
  add column if not exists trashed_with_place boolean not null default false;

-- Nobody reads a place in the Trash through the normal rules.
drop policy if exists "anyone can read destinations" on public.destinations;
create policy "anyone can read destinations" on public.destinations for
select to anon, authenticated using (trashed_at is null);

drop policy if exists "api can read destinations" on public.destinations;
create policy "api can read destinations" on public.destinations for
select to lakat_api using (trashed_at is null);

drop policy if exists "anyone can read accommodations" on public.accommodations;
create policy "anyone can read accommodations" on public.accommodations for
select to anon, authenticated using (trashed_at is null);

drop policy if exists "api can read accommodations" on public.accommodations;
create policy "api can read accommodations" on public.accommodations for
select to lakat_api using (trashed_at is null);

-- Admins cannot edit a place while it is in the Trash (the same as 043,
-- plus "not in the Trash").
drop policy if exists "admins can edit destinations" on public.destinations;
create policy "admins can edit destinations" on public.destinations for
update to authenticated
    using ((select public.is_admin ()) and trashed_at is null)
    with check ((select public.is_admin ()));

drop policy if exists "admins can edit accommodations" on public.accommodations;
create policy "admins can edit accommodations" on public.accommodations for
update to authenticated
    using ((select public.is_admin ()) and trashed_at is null)
    with check ((select public.is_admin ()));

-- Nobody can write a review of a place in the Trash (the check in
-- reviews_before_write, 046, does not see the Trash). The same answer as
-- for a place that does not exist (P0001, "That place does not exist.").
create or replace function public.reviews_place_not_in_trash()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (new.place_type = 'destination'
      and exists (select 1 from public.destinations where id = new.place_id and trashed_at is not null))
     or (new.place_type = 'accommodation'
      and exists (select 1 from public.accommodations where id = new.place_id and trashed_at is not null)) then
    raise exception 'That place does not exist';
  end if;
  return new;
end;
$$;

revoke all on function public.reviews_place_not_in_trash() from public, anon;

drop trigger if exists reviews_place_not_in_trash on public.reviews;
create trigger reviews_place_not_in_trash
  before insert on public.reviews
  for each row execute function public.reviews_place_not_in_trash();

-- 3. Trash and restore a reply (admins only) ----------------------------------

-- Answers 'trashed', or null when there is no such reply (or it is
-- deleted, or in the Trash already).
create or replace function public.admin_trash_reply(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  reply public.review_replies%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete other travelers'' replies.' using errcode = '42501';
  end if;
  select * into reply from public.review_replies
   where id = target and deleted_at is null and trashed_at is null
     for update;
  if not found then
    return null;
  end if;
  insert into public.trashed_reply_texts (reply_id, comment, replier_name, traveler_type, user_id)
  values (reply.id, reply.comment, reply.replier_name, reply.traveler_type, reply.user_id);
  update public.review_replies
     set comment = '', replier_name = '', traveler_type = null, user_id = null,
         trashed_at = now(), trashed_by = auth.uid()
   where id = target;
  delete from public.notifications where reply_id = target;
  return 'trashed';
end;
$$;

-- Answers 'restored', or null when it is not in the Trash. Refuses
-- (55000) while its review is in the Trash.
create or replace function public.admin_restore_reply(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  reply public.review_replies%rowtype;
  kept public.trashed_reply_texts%rowtype;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may restore replies.' using errcode = '42501';
  end if;
  select * into reply from public.review_replies
   where id = target and trashed_at is not null
     for update;
  if not found then
    return null;
  end if;
  if exists (select 1 from public.reviews where id = reply.review_id and trashed_at is not null) then
    raise exception 'Its review is in the Trash. Restore the review first, then this reply.'
      using errcode = '55000';
  end if;
  select * into kept from public.trashed_reply_texts where reply_id = target;
  update public.review_replies
     set comment = coalesce(kept.comment, ''),
         replier_name = coalesce(kept.replier_name, ''),
         traveler_type = kept.traveler_type,
         user_id = kept.user_id,
         trashed_at = null, trashed_by = null
   where id = target;
  delete from public.trashed_reply_texts where reply_id = target;
  return 'restored';
end;
$$;

-- The replies in the Trash, newest first: enough to recognise each one.
-- A hidden reply shows its hidden text (056).
create or replace function public.admin_trashed_replies()
returns table (
  id uuid,
  review_id uuid,
  place_type text,
  place_id uuid,
  place_name text,
  reviewer_name text,
  replier_name text,
  comment text,
  answer_count int,
  like_count int,
  review_in_trash boolean,
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
    select p.id, p.review_id, r.place_type, r.place_id,
           coalesce(d.name, a.name, 'A place that was deleted'),
           r.reviewer_name,
           coalesce(nullif(t.replier_name, ''), 'A traveler'),
           coalesce(nullif(h.comment, ''), t.comment, ''),
           (select count(*)::int from public.review_replies c where c.parent_reply_id = p.id),
           (select count(*)::int from public.reply_likes l where l.reply_id = p.id),
           r.trashed_at is not null,
           p.trashed_at,
           coalesce(nullif(btrim(left(u.raw_user_meta_data ->> 'display_name', 40)), ''), 'An admin')
      from public.review_replies p
      join public.reviews r on r.id = p.review_id
      left join public.trashed_reply_texts t on t.reply_id = p.id
      left join public.reply_hidden_texts h on h.reply_id = p.id
      left join public.destinations d on r.place_type = 'destination' and d.id = r.place_id
      left join public.accommodations a on r.place_type = 'accommodation' and a.id = r.place_id
      left join auth.users u on u.id = p.trashed_by
     where p.trashed_at is not null
     order by p.trashed_at desc;
end;
$$;

-- 4. Trash and restore a place (admins only) ----------------------------------

-- Answers 'trashed', or null when there is no such place (or it is in the
-- Trash already). Its reviews not already in the Trash go with it.
create or replace function public.admin_trash_place(kind text, target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  moved uuid;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete places.' using errcode = '42501';
  end if;
  if kind = 'destination' then
    update public.destinations set trashed_at = now(), trashed_by = auth.uid()
     where id = target and trashed_at is null returning id into moved;
  elsif kind = 'accommodation' then
    update public.accommodations set trashed_at = now(), trashed_by = auth.uid()
     where id = target and trashed_at is null returning id into moved;
  end if;
  if moved is null then
    return null;
  end if;
  update public.reviews
     set trashed_at = now(), trashed_by = auth.uid(), trashed_with_place = true
   where place_type = kind and place_id = target and trashed_at is null;
  insert into public.review_visibility_signals (place_type, place_id) values (kind, target);
  return 'trashed';
end;
$$;

-- Answers 'restored', or null when it is not in the Trash. The reviews
-- that went with it come back with it.
create or replace function public.admin_restore_place(kind text, target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  moved uuid;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may restore places.' using errcode = '42501';
  end if;
  if kind = 'destination' then
    update public.destinations set trashed_at = null, trashed_by = null
     where id = target and trashed_at is not null returning id into moved;
  elsif kind = 'accommodation' then
    update public.accommodations set trashed_at = null, trashed_by = null
     where id = target and trashed_at is not null returning id into moved;
  end if;
  if moved is null then
    return null;
  end if;
  update public.reviews
     set trashed_at = null, trashed_by = null, trashed_with_place = false
   where place_type = kind and place_id = target and trashed_with_place;
  insert into public.review_visibility_signals (place_type, place_id) values (kind, target);
  return 'restored';
end;
$$;

-- The places in the Trash, newest first.
create or replace function public.admin_trashed_places()
returns table (
  id uuid,
  place_type text,
  name text,
  photo_url text,
  review_count int,
  photo_count int,
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
    select x.id, x.place_type, x.name, x.photo_url,
           (select count(*)::int from public.reviews r
             where r.place_type = x.place_type and r.place_id = x.id and r.trashed_with_place),
           (select count(*)::int from public.place_photos pp
             where pp.place_type = x.place_type and pp.place_id = x.id),
           x.trashed_at,
           coalesce(nullif(btrim(left(u.raw_user_meta_data ->> 'display_name', 40)), ''), 'An admin')
      from (
        select d.id, 'destination'::text as place_type, d.name, d.photo_url, d.trashed_at, d.trashed_by
          from public.destinations d where d.trashed_at is not null
        union all
        select a.id, 'accommodation'::text, a.name, a.photo_url, a.trashed_at, a.trashed_by
          from public.accommodations a where a.trashed_at is not null
      ) x
      left join auth.users u on u.id = x.trashed_by
     order by x.trashed_at desc;
end;
$$;

-- 5. Reviews (060), now knowing about places in the Trash ----------------------

-- The same as 060, plus: refused (55000) while its place is in the Trash.
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
    from public.reviews where id = target and trashed_at is not null and not trashed_with_place for update;
  if found_review.id is null then
    return null;
  end if;
  if exists (select 1 from public.destinations where found_review.place_type = 'destination'
                and id = found_review.place_id and trashed_at is not null)
     or exists (select 1 from public.accommodations where found_review.place_type = 'accommodation'
                and id = found_review.place_id and trashed_at is not null) then
    raise exception 'Its place is in the Trash. Restore the place first, then this review.'
      using errcode = '55000';
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

-- The same as 060, without the reviews that went with their place (the
-- place stands for them in the Trash), and saying whether its place is in
-- the Trash.
drop function if exists public.admin_trashed_reviews();
create function public.admin_trashed_reviews()
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
  place_in_trash boolean,
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
           coalesce(d.trashed_at, a.trashed_at) is not null,
           r.trashed_at,
           coalesce(nullif(btrim(left(u.raw_user_meta_data ->> 'display_name', 40)), ''), 'An admin')
      from public.reviews r
      left join public.destinations d on r.place_type = 'destination' and d.id = r.place_id
      left join public.accommodations a on r.place_type = 'accommodation' and a.id = r.place_id
      left join auth.users u on u.id = r.trashed_by
     where r.trashed_at is not null and not r.trashed_with_place
     order by r.trashed_at desc;
end;
$$;

-- 6. Who may call the functions -------------------------------------------------

revoke all on function public.admin_trash_reply(uuid) from public, anon;
revoke all on function public.admin_restore_reply(uuid) from public, anon;
revoke all on function public.admin_trashed_replies() from public, anon;
revoke all on function public.admin_trash_place(text, uuid) from public, anon;
revoke all on function public.admin_restore_place(text, uuid) from public, anon;
revoke all on function public.admin_trashed_places() from public, anon;
revoke all on function public.admin_restore_review(uuid) from public, anon;
revoke all on function public.admin_trashed_reviews() from public, anon;
grant execute on function public.admin_trash_reply(uuid) to authenticated;
grant execute on function public.admin_restore_reply(uuid) to authenticated;
grant execute on function public.admin_trashed_replies() to authenticated;
grant execute on function public.admin_trash_place(text, uuid) to authenticated;
grant execute on function public.admin_restore_place(text, uuid) to authenticated;
grant execute on function public.admin_trashed_places() to authenticated;
grant execute on function public.admin_restore_review(uuid) to authenticated;
grant execute on function public.admin_trashed_reviews() to authenticated;

-- 7. Check it worked ------------------------------------------------------------
--
-- Should list the six new functions:
--   select proname from pg_proc
--    where proname in ('admin_trash_reply', 'admin_restore_reply', 'admin_trashed_replies',
--                      'admin_trash_place', 'admin_restore_place', 'admin_trashed_places');
--
-- Should say true (Row Level Security on):
--   select relrowsecurity from pg_class where relname = 'trashed_reply_texts';
--
-- Should show "(trashed_at IS NULL)" for each place read rule:
--   select tablename, policyname, qual from pg_policies
--    where tablename in ('destinations', 'accommodations') and cmd = 'SELECT';
