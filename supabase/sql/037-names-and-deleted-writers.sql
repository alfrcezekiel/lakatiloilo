-- Names on notifications, and deleted replies forget their writer
-- (thread care round, code review of commit 092153e).
--
-- 1. A traveler who changes their display name now has it changed on the
--    notifications they caused too ("Maria replied to your review" becomes
--    "Maria S. replied …"), like their reviews and replies (030, 033).
--    Notifications about replies (035) did not record who replied, so
--    they gain actor_id now, filled in for the existing ones.
-- 2. A reply that became "This reply was deleted" (034) kept its
--    writer's account id. The backend never sends it, but anyone can read
--    replies through Supabase's public data API, so the writer could still
--    be looked up. Now deleting clears it (user_id becomes empty), and the
--    replies already deleted are cleared too. Nothing needs it afterwards:
--    a deleted reply cannot be edited, liked or answered.
--
-- Safety: Row Level Security and every policy are unchanged. Policies
-- compare user_id with the logged-in traveler, so an empty user_id
-- matches nobody. The three functions below are the same as before
-- (035, 034) except for the lines marked "037". Nothing here uses the
-- service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Who caused each reply notification -----------------------------------
--
-- 036 added actor_id for Helpful likes; now replies fill it in too.
create or replace function public.notify_on_new_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  what text;
begin
  if new.parent_reply_id is null then
    select user_id into recipient from public.reviews where id = new.review_id;
    what := 'review_reply';
  else
    select user_id into recipient from public.review_replies where id = new.parent_reply_id;
    what := 'reply_answer';
  end if;

  if recipient is not null and recipient <> new.user_id then
    -- 037: actor_id, so a later name change reaches this notification.
    insert into public.notifications (user_id, kind, review_id, reply_id, actor_id, actor_name)
    values (recipient, what, new.review_id, new.id, new.user_id, new.replier_name);
  end if;
  return new;
end;
$$;

-- The reply notifications made before today.
update public.notifications n
   set actor_id = r.user_id
  from public.review_replies r
 where r.id = n.reply_id
   and n.kind in ('review_reply', 'reply_answer')
   and n.actor_id is null;

-- 2. A changed name reaches the notifications too ---------------------------
--
-- The same as 034, plus the notifications update at the end.
create or replace function public.copy_profile_to_reviews_and_replies()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  new_name text := public.public_name_of(new.raw_user_meta_data);
  new_type text := case
    when new.raw_user_meta_data ->> 'traveler_type' in ('local', 'domestic', 'foreign')
      then new.raw_user_meta_data ->> 'traveler_type'
  end;
begin
  -- The reviews trigger fills in the name and type from the account
  -- again and keeps updated_at as it was.
  update public.reviews
     set reviewer_name = new_name,
         traveler_type = new_type
   where user_id = new.id
     and (reviewer_name is distinct from new_name
          or traveler_type is distinct from new_type);

  update public.review_replies
     set replier_name = new_name,
         traveler_type = new_type
   where user_id = new.id
     and deleted_at is null
     and (replier_name is distinct from new_name
          or traveler_type is distinct from new_type);

  -- 037: the notifications this traveler caused.
  update public.notifications
     set actor_name = new_name
   where actor_id = new.id
     and actor_name is distinct from new_name;

  return new;
end;
$$;

-- 3. A deleted reply forgets its writer --------------------------------------
alter table public.review_replies
  alter column user_id drop not null;

-- The same as 035, except the soft delete also empties user_id (037).
create or replace function public.delete_own_reply(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  reply public.review_replies%rowtype;
  parent public.review_replies%rowtype;
  next_parent uuid;
begin
  select * into reply
    from public.review_replies
   where id = target
     and user_id = auth.uid()
     and deleted_at is null
     for update;
  if not found then
    return null;
  end if;

  if exists (select 1 from public.review_replies where parent_reply_id = target) then
    update public.review_replies
       set comment = '',
           replier_name = '',
           traveler_type = null,
           user_id = null,  -- 037
           deleted_at = now()
     where id = target;
    delete from public.reply_likes where reply_id = target;
    delete from public.notifications where reply_id = target;
    return 'kept';
  end if;

  delete from public.review_replies where id = target;

  -- Climb the thread: a deleted reply left with no answers goes too.
  next_parent := reply.parent_reply_id;
  while next_parent is not null loop
    select * into parent from public.review_replies where id = next_parent for update;
    exit when not found
           or parent.deleted_at is null
           or exists (select 1 from public.review_replies where parent_reply_id = parent.id);
    delete from public.review_replies where id = parent.id;
    next_parent := parent.parent_reply_id;
  end loop;

  return 'removed';
end;
$$;

-- The replies already deleted.
update public.review_replies
   set user_id = null
 where deleted_at is not null
   and user_id is not null;

-- 4. Check it worked -------------------------------------------------
--
-- Should answer 0 (no deleted reply still has a writer):
--   select count(*) from public.review_replies
--    where deleted_at is not null and user_id is not null;
--
-- Should answer 0 (every reply notification knows who replied):
--   select count(*) from public.notifications
--    where kind in ('review_reply', 'reply_answer') and actor_id is null;
--
-- Should still show the same policies, and rowsecurity = true for both:
--   select tablename, policyname, cmd from pg_policies
--    where tablename in ('review_replies', 'notifications') order by 1, 2;
--   select relname, relrowsecurity as rowsecurity from pg_class
--    where relname in ('review_replies', 'notifications');
