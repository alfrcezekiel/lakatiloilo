-- Editing your own reply (profile & replies round, ticket 95).
--
-- Until now nobody could edit a reply (025 gave no update permission and
-- no update policy). Now a reply's writer may change its text, and only
-- its text. An edited reply remembers when, in a new updated_at column, so
-- the page can show "· edited".
--
-- Safety: travelers get permission to change only the comment column;
-- review_id, parent_reply_id, user_id, the name, the type and the dates
-- stay out of reach. The new policy lets each traveler change only their
-- own replies. Row Level Security stays on, and the other four policies
-- are unchanged. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. When a reply was last edited --------------------------------------
--
-- Empty (null) until its writer first edits it, so replies that were
-- never edited show no "· edited".

alter table public.review_replies
  add column if not exists updated_at timestamptz;

-- 2. Set by the database, only when the text really changes --------------
--
-- 030 also updates replies when a traveler changes their display name
-- (it copies the new name onto them). That is not an edit, so it must not
-- set updated_at: only a changed comment does.

create or replace function public.review_replies_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.comment is distinct from old.comment then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

drop trigger if exists review_replies_before_update on public.review_replies;

create trigger review_replies_before_update
  before update on public.review_replies
  for each row execute function public.review_replies_before_update();

-- 3. Travelers may change only the text ----------------------------------

grant update (comment) on public.review_replies to authenticated;

-- 4. Row Level Security: only your own replies ---------------------------
--
-- "using" decides which replies a traveler may change (their own);
-- "with check" makes sure the changed reply is still theirs.

create policy "repliers can edit their own replies"
  on public.review_replies for update
  to authenticated
  using ((select auth.uid ()) = user_id)
  with check ((select auth.uid ()) = user_id);

-- 5. Check it worked -------------------------------------------------
--
-- Should list five policies (the four from 025 plus "repliers can edit
-- their own replies"):
--   select policyname, cmd, roles from pg_policies where tablename = 'review_replies';
--
-- Should show rowsecurity = true:
--   select relname, relrowsecurity as rowsecurity from pg_class where relname = 'review_replies';
--
-- Should list only "comment" for authenticated:
--   select column_name from information_schema.column_privileges
--    where table_name = 'review_replies' and grantee = 'authenticated'
--      and privilege_type = 'UPDATE';
