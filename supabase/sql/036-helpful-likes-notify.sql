-- Helpful likes notify the writer (thread care round, ticket 106).
--
-- Until now only replies made notifications (035). Now, when another
-- traveler marks your review or your reply Helpful, you get one too:
--   - 'review_like': someone marked your review Helpful,
--   - 'reply_like':  someone marked your reply Helpful.
-- Never for your own review or reply (the like policies already refuse
-- liking your own, 024 and 032/034; the triggers check again).
-- Removing a Helpful mark removes the notification it made, so marking on
-- and off cannot flood someone's bell.
--
-- The notifications table gains actor_id (who replied or liked), so the
-- right notification can be removed, and reply_id may now be empty (a
-- review like has no reply).
--
-- Safety: Row Level Security on notifications is unchanged (a traveler
-- reads only their own and may change only read_at; nobody adds or deletes
-- through the app). The triggers run as "security definer" so they may
-- write a row for another traveler; they use search_path = '' and full
-- table names, and the liker's name comes from their account through the
-- shared name rule (033), never from the browser. Nothing here uses the
-- service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The two new kinds, who did it, and no reply for a review like ------
alter table public.notifications
  drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in ('review_reply', 'reply_answer', 'review_like', 'reply_like'));

alter table public.notifications
  add column if not exists actor_id uuid references auth.users (id) on delete cascade;

alter table public.notifications
  alter column reply_id drop not null;

-- Makes "the notification this like made" fast to find and remove.
create index if not exists notifications_actor_idx
  on public.notifications (actor_id, kind);

-- 2. A Helpful mark on a review -----------------------------------------
create or replace function public.notify_on_review_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
begin
  select user_id into recipient from public.reviews where id = new.review_id;
  if recipient is not null and recipient <> new.user_id then
    insert into public.notifications (user_id, kind, review_id, actor_id, actor_name)
    select recipient, 'review_like', new.review_id, new.user_id,
           public.public_name_of(u.raw_user_meta_data)
      from auth.users u
     where u.id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_on_review_like on public.review_likes;
create trigger notify_on_review_like
  after insert on public.review_likes
  for each row execute function public.notify_on_review_like();

-- 3. A Helpful mark on a reply -------------------------------------------
create or replace function public.notify_on_reply_like()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  recipient uuid;
  under_review uuid;
begin
  select user_id, review_id into recipient, under_review
    from public.review_replies
   where id = new.reply_id;
  if recipient is not null and recipient <> new.user_id then
    insert into public.notifications (user_id, kind, review_id, reply_id, actor_id, actor_name)
    select recipient, 'reply_like', under_review, new.reply_id, new.user_id,
           public.public_name_of(u.raw_user_meta_data)
      from auth.users u
     where u.id = new.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists notify_on_reply_like on public.reply_likes;
create trigger notify_on_reply_like
  after insert on public.reply_likes
  for each row execute function public.notify_on_reply_like();

-- 4. Removing a Helpful mark removes its notification --------------------
create or replace function public.unnotify_on_review_unlike()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications
   where kind = 'review_like'
     and review_id = old.review_id
     and actor_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists unnotify_on_review_unlike on public.review_likes;
create trigger unnotify_on_review_unlike
  after delete on public.review_likes
  for each row execute function public.unnotify_on_review_unlike();

create or replace function public.unnotify_on_reply_unlike()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.notifications
   where kind = 'reply_like'
     and reply_id = old.reply_id
     and actor_id = old.user_id;
  return old;
end;
$$;

drop trigger if exists unnotify_on_reply_unlike on public.reply_likes;
create trigger unnotify_on_reply_unlike
  after delete on public.reply_likes
  for each row execute function public.unnotify_on_reply_unlike();

-- 5. Check it worked -------------------------------------------------
--
-- Should still list the same two policies, and rowsecurity = true:
--   select policyname, cmd from pg_policies where tablename = 'notifications';
--   select relname, relrowsecurity as rowsecurity from pg_class where relname = 'notifications';
--
-- Should list the four kinds:
--   select pg_get_constraintdef(oid) from pg_constraint
--    where conname = 'notifications_kind_check';
--
-- Should list notify_on_review_like and unnotify_on_review_unlike:
--   select tgname from pg_trigger
--    where tgrelid = 'public.review_likes'::regclass and not tgisinternal;
--
-- Should list notify_on_reply_like and unnotify_on_reply_unlike:
--   select tgname from pg_trigger
--    where tgrelid = 'public.reply_likes'::regclass and not tgisinternal;
