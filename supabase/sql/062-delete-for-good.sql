-- Delete for good, and the Trash's 30 days (admin extras round, ticket 149).
--
-- In the Trash (060, 061), "Delete for good" removes an item after a
-- pop-up, and anything that has waited more than 30 days is deleted for
-- good when an admin opens the Trash (no scheduled job). Each function
-- answers the photo files to delete, and the backend deletes them from
-- Storage afterwards, as the admin (as Delete place did before, 051).
--
--   - A review: deleted with its replies, Helpful likes, reports, photo
--     rows and notifications (they already go with it, "on delete
--     cascade").
--   - A reply: the same rule as deleting one before the Trash (052): with
--     answers under it, it stays for good as "This reply was deleted" and
--     the answers stay (its likes go); with none, it is removed, and a
--     deleted reply above it that is left with no answers goes too.
--   - A place: deleted with every review of it (051's trigger), its photos
--     and their credits (059, 054).
--
-- Functions, admins only (is_admin()): admin_delete_review_for_good,
-- admin_delete_reply_for_good, admin_delete_place_for_good,
-- admin_empty_expired_trash. Only items in the Trash can be deleted this
-- way. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. A review --------------------------------------------------------------------
--
-- Answers its photo files (an empty list when it had none), or null when
-- it is not in the Trash on its own (one that went with its place goes
-- with the place).
create or replace function public.admin_delete_review_for_good(target uuid)
returns text[]
language plpgsql
security definer
set search_path = ''
as $$
declare
  files text[];
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete reviews.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.reviews
                  where id = target and trashed_at is not null and not trashed_with_place) then
    return null;
  end if;
  select coalesce(array_agg(photo_path), '{}') into files
    from public.review_photos where review_id = target;
  delete from public.reviews where id = target;
  return files;
end;
$$;

-- 2. A reply ---------------------------------------------------------------------
--
-- The rule itself, for a reply already in the Trash, without the admin
-- check (the two functions below check it first).
create or replace function public.delete_trashed_reply(target uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  reply public.review_replies%rowtype;
  parent public.review_replies%rowtype;
  next_parent uuid;
begin
  select * into reply from public.review_replies where id = target and trashed_at is not null for update;
  if not found then
    return;
  end if;
  delete from public.trashed_reply_texts where reply_id = target;

  if exists (select 1 from public.review_replies where parent_reply_id = target) then
    -- Stays as "This reply was deleted" (its text, name, tag and writer
    -- are empty already). Setting deleted_at forgets a hidden text (056).
    update public.review_replies
       set deleted_at = now(), trashed_at = null, trashed_by = null
     where id = target;
    delete from public.reply_likes where reply_id = target;
    return;
  end if;

  delete from public.review_replies where id = target;

  -- Climb the thread: a deleted reply left with no answers goes too (not
  -- one in the Trash: it waits there).
  next_parent := reply.parent_reply_id;
  while next_parent is not null loop
    select * into parent from public.review_replies where id = next_parent for update;
    exit when not found
           or parent.deleted_at is null
           or exists (select 1 from public.review_replies where parent_reply_id = parent.id);
    delete from public.review_replies where id = parent.id;
    next_parent := parent.parent_reply_id;
  end loop;
end;
$$;

revoke all on function public.delete_trashed_reply(uuid) from public, anon, authenticated;

-- Answers 'deleted', or null when it is not in the Trash.
create or replace function public.admin_delete_reply_for_good(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete other travelers'' replies.' using errcode = '42501';
  end if;
  if not exists (select 1 from public.review_replies where id = target and trashed_at is not null) then
    return null;
  end if;
  perform public.delete_trashed_reply(target);
  return 'deleted';
end;
$$;

-- 3. A place ---------------------------------------------------------------------
--
-- The place's photo addresses and its reviews' photo files, for a place
-- (any, the admin check is in the callers).
create or replace function public.files_of_place(kind text, target uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'photo_urls', coalesce((
      select jsonb_agg(distinct u) from (
        select photo_url as u from public.destinations where kind = 'destination' and id = target and photo_url is not null
        union all
        select photo_url from public.accommodations where kind = 'accommodation' and id = target and photo_url is not null
        union all
        select photo_url from public.place_photos where place_type = kind and place_id = target
      ) urls), '[]'::jsonb),
    'review_photo_paths', coalesce((
      select jsonb_agg(p.photo_path) from public.review_photos p
        join public.reviews r on r.id = p.review_id
       where r.place_type = kind and r.place_id = target), '[]'::jsonb)
  );
$$;

revoke all on function public.files_of_place(text, uuid) from public, anon, authenticated;

-- Answers { photo_urls, review_photo_paths } (the files to delete), or
-- null when it is not in the Trash.
create or replace function public.admin_delete_place_for_good(kind text, target uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  files jsonb;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete places.' using errcode = '42501';
  end if;
  if not (
    (kind = 'destination' and exists (select 1 from public.destinations where id = target and trashed_at is not null))
    or (kind = 'accommodation' and exists (select 1 from public.accommodations where id = target and trashed_at is not null))
  ) then
    return null;
  end if;
  files := public.files_of_place(kind, target);
  if kind = 'destination' then
    delete from public.destinations where id = target;
  else
    delete from public.accommodations where id = target;
  end if;
  return files;
end;
$$;

-- 4. The 30 days -------------------------------------------------------------------
--
-- Deletes for good everything that went to the Trash more than 30 days
-- ago: places first (each takes all its reviews), then reviews, then
-- replies. Answers { photo_urls, review_photo_paths } and how many items
-- went ({ places, reviews, replies }).
create or replace function public.admin_empty_expired_trash()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  cutoff timestamptz := now() - interval '30 days';
  photo_urls jsonb := '[]'::jsonb;
  review_paths jsonb := '[]'::jsonb;
  files jsonb;
  item record;
  places int := 0;
  reviews int := 0;
  replies int := 0;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may open the Trash.' using errcode = '42501';
  end if;

  for item in
    select 'destination'::text as kind, id from public.destinations where trashed_at < cutoff
    union all
    select 'accommodation', id from public.accommodations where trashed_at < cutoff
  loop
    files := public.files_of_place(item.kind, item.id);
    photo_urls := photo_urls || (files -> 'photo_urls');
    review_paths := review_paths || (files -> 'review_photo_paths');
    if item.kind = 'destination' then
      delete from public.destinations where id = item.id;
    else
      delete from public.accommodations where id = item.id;
    end if;
    places := places + 1;
  end loop;

  review_paths := review_paths || coalesce((
    select jsonb_agg(p.photo_path) from public.review_photos p
      join public.reviews r on r.id = p.review_id
     where r.trashed_at < cutoff and not r.trashed_with_place), '[]'::jsonb);
  with gone as (
    delete from public.reviews where trashed_at < cutoff and not trashed_with_place returning 1
  ) select count(*) into reviews from gone;

  -- Newest first, so an answer goes before the reply it answers.
  for item in
    select id from public.review_replies where trashed_at < cutoff order by created_at desc
  loop
    perform public.delete_trashed_reply(item.id);
    replies := replies + 1;
  end loop;

  return jsonb_build_object(
    'photo_urls', photo_urls,
    'review_photo_paths', review_paths,
    'places', places,
    'reviews', reviews,
    'replies', replies
  );
end;
$$;

-- 5. Who may call the functions -------------------------------------------------

revoke all on function public.admin_delete_review_for_good(uuid) from public, anon;
revoke all on function public.admin_delete_reply_for_good(uuid) from public, anon;
revoke all on function public.admin_delete_place_for_good(text, uuid) from public, anon;
revoke all on function public.admin_empty_expired_trash() from public, anon;
grant execute on function public.admin_delete_review_for_good(uuid) to authenticated;
grant execute on function public.admin_delete_reply_for_good(uuid) to authenticated;
grant execute on function public.admin_delete_place_for_good(text, uuid) to authenticated;
grant execute on function public.admin_empty_expired_trash() to authenticated;

-- 6. Check it worked ------------------------------------------------------------
--
-- Should list the four functions:
--   select proname from pg_proc
--    where proname in ('admin_delete_review_for_good', 'admin_delete_reply_for_good',
--                      'admin_delete_place_for_good', 'admin_empty_expired_trash');
