-- "This reply was deleted" (thread care round, ticket 100).
--
-- Until now deleting a reply deleted every answer under it (028). Now:
--   - A reply WITH answers stays in its place as "This reply was deleted":
--     the database clears its text, name and traveler type, removes its
--     Helpful likes and sets the new deleted_at column. Its answers stay.
--   - A reply with NO answers is removed completely, as before. When that
--     was the last answer under a deleted reply, the deleted reply goes
--     too (and so on up the thread).
--   - A deleted reply cannot be edited, liked or answered.
--
-- Deleting now goes through one database function, delete_own_reply,
-- which only ever touches the logged-in traveler's own reply. Travelers no
-- longer have direct permission to delete replies, so nobody can skip the
-- function and wipe out a whole thread. Deleting a review still removes
-- all its replies, as before.
--
-- Safety: Row Level Security stays on. The read and add policies are
-- unchanged; the delete policy goes (nothing may delete directly), the
-- edit policy and the reply-like policy also refuse deleted replies.
-- delete_own_reply runs as "security definer" (so it may blank a reply and
-- remove other travelers' likes on it), checks auth.uid() itself, and uses
-- search_path = '' and full table names. Nothing here uses the
-- service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. When a reply was deleted ----------------------------------------
--
-- Empty (null) for every reply that is still there.
alter table public.review_replies
  add column if not exists deleted_at timestamptz;

-- A deleted reply has empty text, so the 1-300 character rule from 025
-- applies only to replies that are not deleted.
alter table public.review_replies
  drop constraint if exists review_replies_comment_check;
alter table public.review_replies
  add constraint review_replies_comment_check check (
    deleted_at is not null
    or char_length(btrim(comment)) between 1 and 300
  );

-- 2. Deleting your own reply -----------------------------------------
--
-- Answers 'kept' (it had answers, so it now says "This reply was
-- deleted"), 'removed' (it is gone), or null when the logged-in traveler
-- has no such reply (someone else's, already deleted, or missing).
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

revoke all on function public.delete_own_reply(uuid) from public, anon;
grant execute on function public.delete_own_reply(uuid) to authenticated;

-- 3. Travelers may no longer delete replies directly ------------------
--
-- Only through delete_own_reply above. (Deleting a review still removes
-- its replies: the database does that itself, "on delete cascade".)
revoke delete on public.review_replies from authenticated;
drop policy if exists "repliers can delete their own replies" on public.review_replies;

-- 4. A deleted reply cannot be edited ----------------------------------
drop policy if exists "repliers can edit their own replies" on public.review_replies;
create policy "repliers can edit their own replies"
  on public.review_replies for update
  to authenticated
  using ((select auth.uid ()) = user_id and deleted_at is null)
  with check ((select auth.uid ()) = user_id and deleted_at is null);

-- 5. A deleted reply cannot be liked -----------------------------------
--
-- The same as 032 (only as yourself, never your own reply), and the reply
-- must not be deleted.
drop policy if exists "travelers can like other travelers' replies" on public.reply_likes;
create policy "travelers can like other travelers' replies" on public.reply_likes for
insert
    to authenticated
with
    check (
        (select auth.uid ()) = user_id
        and exists (
            select 1
              from public.review_replies r
             where r.id = reply_id
               and r.user_id <> (select auth.uid ())
               and r.deleted_at is null
        )
    );

-- 6. A deleted reply cannot be answered --------------------------------
--
-- The same check as 028, plus: the parent must not be deleted (code
-- 55000, which the backend turns into "That reply was deleted, so it
-- can't be answered.").
create or replace function public.review_replies_check_parent()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.parent_reply_id is not null
     and not exists (
       select 1
         from public.review_replies p
        where p.id = new.parent_reply_id
          and p.review_id = new.review_id
     ) then
    raise exception 'That reply isn''t under this review.'
      using errcode = '22023';
  end if;
  if exists (
       select 1
         from public.review_replies p
        where p.id = new.parent_reply_id
          and p.deleted_at is not null
     ) then
    raise exception 'That reply was deleted, so it can''t be answered.'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

-- 7. A changed name never comes back on a deleted reply ----------------
--
-- The same as 033, except deleted replies are skipped, so they keep no
-- name.
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

  return new;
end;
$$;

-- 8. Check it worked -------------------------------------------------
--
-- Should list four policies on review_replies (anyone can read, api can
-- read, travelers can add their own replies, repliers can edit their own
-- replies), and NOT "repliers can delete their own replies":
--   select policyname, cmd from pg_policies where tablename = 'review_replies';
--
-- Should show rowsecurity = true for both:
--   select relname, relrowsecurity as rowsecurity from pg_class
--    where relname in ('review_replies', 'reply_likes');
--
-- Should show deleted_at, timestamp with time zone, nullable:
--   select column_name, data_type, is_nullable from information_schema.columns
--    where table_name = 'review_replies' and column_name = 'deleted_at';
--
-- Should answer null (you are not logged in in the SQL Editor, so you have
-- no replies to delete):
--   select public.delete_own_reply(gen_random_uuid());
