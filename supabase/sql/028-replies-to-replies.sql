-- Replies to replies (threaded replies round, ticket 85).
--
-- Until now a reply could only answer a review. This adds parent_reply_id
-- to review_replies: the reply being answered, or empty (null) when the
-- reply answers the review itself. So travelers can answer each other and
-- the website can show answers indented under the reply they answer.
--
--   - Deleting a reply deletes every answer under it, all levels deep
--     ("on delete cascade"), the same way deleting a review deletes its
--     replies. The team chose this on 2026-11-02.
--   - The database refuses a parent reply that is under a different
--     review, so a thread can never jump between reviews.
--   - Travelers may now send parent_reply_id when adding a reply. Nobody
--     may change it afterwards (there is still no edit permission).
--
-- Row Level Security stays on and the policies from 025 do not change:
-- anyone may read, a logged-in traveler may add a reply only as
-- themselves, only the writer may delete it, nobody may edit it.
-- Nothing here touches the service_role.
--
-- Safe to run again: each step checks whether it is already done.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The new column ------------------------------------------------------

alter table public.review_replies
  add column if not exists parent_reply_id uuid
    references public.review_replies (id) on delete cascade;

-- Makes "the answers under this reply" fast, and deleting a thread too.
create index if not exists review_replies_parent_idx
  on public.review_replies (parent_reply_id);

-- 2. A parent reply must be under the same review ------------------------
--
-- Runs before every new reply. With a parent_reply_id, that reply must
-- exist and be under the same review, or the new reply is refused with
-- code 22023, which the backend turns into "That reply isn't under this
-- review." Reading other replies is allowed to everyone anyway, so this
-- does not need "security definer". search_path = '' and full table names
-- stop anyone from tricking it into using a look-alike table.

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
  return new;
end;
$$;

drop trigger if exists review_replies_check_parent on public.review_replies;

create trigger review_replies_check_parent
  before insert on public.review_replies
  for each row execute function public.review_replies_check_parent();

-- 3. Travelers may send the parent reply ---------------------------------
--
-- 025 let travelers send only review_id and comment. Now parent_reply_id
-- too. Everything else is still filled in by the database.

grant insert (parent_reply_id) on public.review_replies to authenticated;

-- 4. Check it worked -----------------------------------------------------
--
-- Should show parent_reply_id, type uuid, nullable:
--   select column_name, data_type, is_nullable from information_schema.columns
--    where table_name = 'review_replies' and column_name = 'parent_reply_id';
-- Should show the same four policies as before, and rowsecurity = true:
--   select policyname, cmd, roles from pg_policies where tablename = 'review_replies';
--   select relname, relrowsecurity as rowsecurity from pg_class where relname = 'review_replies';
-- Should list INSERT on review_id, comment and parent_reply_id for authenticated:
--   select column_name, privilege_type from information_schema.column_privileges
--    where table_name = 'review_replies' and grantee = 'authenticated';
-- Should list both triggers (review_replies_before_insert and review_replies_check_parent):
--   select tgname from pg_trigger
--    where tgrelid = 'public.review_replies'::regclass and not tgisinternal;
