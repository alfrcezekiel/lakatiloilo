-- Notifications (thread care round, ticket 102).
--
-- A new notifications table, filled in only by the database: when someone
-- replies to a traveler's review, or answers a traveler's reply, a row is
-- added for that traveler. Never for their own reply. The website shows
-- them under a bell in the navbar.
--
-- Safety:
--   - Row Level Security is on, with explicit policies: a traveler may
--     read only their own notifications, and may change only read_at on
--     their own (to mark them read, ticket 103). Nobody may add or delete
--     notifications through the app; only the trigger below adds them.
--   - The trigger runs as "security definer" so it may write a row for
--     another traveler, uses search_path = '' and full table names, and
--     copies the replier's name from the reply (which the database itself
--     filled in, 025/033), so nothing typed in the browser reaches it.
--   - The table joins the Realtime list (for ticket 104). Realtime obeys
--     Row Level Security, so each traveler only hears about their own.
--   - The backend reads notifications as the logged-in traveler (like
--     adding a reply), never through its own lakat_api login, so lakat_api
--     gets no access to this table at all.
--   - Deleting a reply (034) now also removes the notifications about it.
--   - Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ------------------------------------------------------
create table if not exists public.notifications (
    id uuid primary key default gen_random_uuid (),
    -- The traveler the notification is for.
    user_id uuid not null references auth.users (id) on delete cascade,
    -- 'review_reply': someone replied to your review.
    -- 'reply_answer': someone answered your reply.
    kind text not null check (kind in ('review_reply', 'reply_answer')),
    -- The review the conversation is under; removed with it.
    review_id uuid not null references public.reviews (id) on delete cascade,
    -- The new reply; removed with it.
    reply_id uuid not null references public.review_replies (id) on delete cascade,
    -- The replier's display name, copied by the database.
    actor_name text not null,
    -- When it was read, or empty.
    read_at timestamptz,
    created_at timestamptz not null default now()
);

-- Makes "my newest notifications" and "how many unread" fast.
create index if not exists notifications_user_idx
  on public.notifications (user_id, created_at desc);

-- 2. Added by the database when a reply is added ---------------------
--
-- Runs after every new reply (by then the name is filled in). A reply to
-- the review notifies the review's writer; an answer to a reply notifies
-- that reply's writer. Never the replier themselves.
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
    insert into public.notifications (user_id, kind, review_id, reply_id, actor_name)
    values (recipient, what, new.review_id, new.id, new.replier_name);
  end if;
  return new;
end;
$$;

drop trigger if exists notify_on_new_reply on public.review_replies;
create trigger notify_on_new_reply
  after insert on public.review_replies
  for each row execute function public.notify_on_new_reply();

-- 3. What website users may touch at all -------------------------------
--
--   - logged-in travelers may read (only their own, see below),
--   - they may change only read_at (only their own),
--   - nobody may add or delete notifications.
revoke all on public.notifications from anon, authenticated;
grant select on public.notifications to authenticated;
grant update (read_at) on public.notifications to authenticated;

-- 4. Row Level Security --------------------------------------------
--
-- Anything without a policy is refused (so no insert or delete policy).
alter table public.notifications enable row level security;

create policy "travelers can read their own notifications"
  on public.notifications for select
  to authenticated
  using ((select auth.uid ()) = user_id);

create policy "travelers can mark their own notifications read"
  on public.notifications for update
  to authenticated
  using ((select auth.uid ()) = user_id)
  with check ((select auth.uid ()) = user_id);

-- 5. Deleting a reply removes the notifications about it --------------
--
-- The same as 034, plus: when a reply becomes "This reply was deleted",
-- the notifications about it go too (a removed reply's go with it by
-- "on delete cascade").
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

-- 6. Realtime (for ticket 104) ----------------------------------------
--
-- Only the "something changed" signal is used; the page then asks the
-- backend again. Realtime checks Row Level Security, so a traveler only
-- hears about their own notifications.
do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'notifications'
  ) then
    alter publication supabase_realtime add table public.notifications;
  end if;
end;
$$;

-- 7. Check it worked -------------------------------------------------
--
-- Table Editor -> notifications should NOT show an "RLS disabled" warning.
--
-- Should list two policies (travelers can read their own notifications,
-- travelers can mark their own notifications read):
--   select policyname, cmd, roles from pg_policies where tablename = 'notifications';
--
-- Should show rowsecurity = true:
--   select relname, relrowsecurity as rowsecurity from pg_class where relname = 'notifications';
--
-- Should list only read_at for UPDATE:
--   select column_name, privilege_type from information_schema.column_privileges
--    where table_name = 'notifications' and grantee = 'authenticated';
--
-- Should list notify_on_new_reply among the reply triggers:
--   select tgname from pg_trigger
--    where tgrelid = 'public.review_replies'::regclass and not tgisinternal;
--
-- Should now list seven tables, including notifications (and NOT review_reports):
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and schemaname = 'public'
--    order by tablename;
