-- "Helpful" likes on replies (profile & replies round, ticket 96).
--
-- The same as Helpful on reviews (024), but for replies: a logged-in
-- traveler can mark another traveler's reply as helpful, and unmark it.
-- Everyone, logged in or not, can see the count. One like per traveler per
-- reply, and nobody can mark their own reply.
--
-- The backend reads likes through its own login (lakat_api) and adds or
-- removes them as the logged-in traveler, so the policies below decide.
-- The table also joins Supabase's Realtime list (like review_likes in
-- 029), so open pages hear that a count changed and ask the backend again.
--
-- Nothing here touches the service_role, and Row Level Security stays on.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ------------------------------------------------------

create table if not exists public.reply_likes (
    -- The reply marked helpful. Deleting the reply deletes its likes.
    reply_id uuid not null references public.review_replies (id) on delete cascade,
    -- Who marked it. Filled in by Supabase from the login, so nobody can
    -- like a reply "as" someone else.
    user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    -- One like per traveler per reply.
    primary key (reply_id, user_id)
);

-- 2. What website users may touch at all -------------------------------
--
--   - anyone may read (to count likes),
--   - logged-in travelers may add a like, choosing only the reply
--     (user_id and the date are set for them),
--   - they may delete (only their own, see the policy below),
--   - nobody may edit a like.

revoke all on public.reply_likes from anon, authenticated;

grant select on public.reply_likes to anon, authenticated;

grant insert (reply_id) on public.reply_likes to authenticated;

grant delete on public.reply_likes to authenticated;

-- 3. Row Level Security --------------------------------------------
--
-- Anything without a policy is refused (so there is no update policy).

alter table public.reply_likes enable row level security;

create policy "anyone can read reply likes" on public.reply_likes for
select to anon, authenticated using (true);

-- Only as yourself, and never on your own reply.
create policy "travelers can like other travelers' replies" on public.reply_likes for
insert
    to authenticated
with
    check (
        (select auth.uid ()) = user_id
        and not exists (
            select 1
              from public.review_replies r
             where r.id = reply_id
               and r.user_id = (select auth.uid ())
        )
    );

create policy "travelers can remove their own reply likes" on public.reply_likes for delete to authenticated using (
    (select auth.uid ()) = user_id
);

-- 4. The backend may read likes ----------------------------------------

grant select on public.reply_likes to lakat_api;

create policy "api can read reply likes"
  on public.reply_likes for select
  to lakat_api
  using (true);

-- 5. Realtime: open pages hear that a count changed ----------------------
--
-- Only the "something changed" signal is used; the page then asks the
-- backend again. Anyone may read reply likes, so this shows nobody
-- anything new.

do $$
begin
  if not exists (
    select 1
      from pg_publication_tables
     where pubname = 'supabase_realtime'
       and schemaname = 'public'
       and tablename = 'reply_likes'
  ) then
    alter publication supabase_realtime add table public.reply_likes;
  end if;
end;
$$;

-- 6. Check it worked -------------------------------------------------
--
-- Table Editor -> reply_likes should NOT show an "RLS disabled" warning.
-- Should list four policies (anyone can read, travelers can like other
-- travelers' replies, travelers can remove their own reply likes, api can
-- read):
--   select policyname, cmd, roles from pg_policies where tablename = 'reply_likes';
-- Should show rowsecurity = true:
--   select relname, relrowsecurity as rowsecurity from pg_class where relname = 'reply_likes';
-- Should now list six tables, including reply_likes (and NOT review_reports):
--   select tablename from pg_publication_tables
--    where pubname = 'supabase_realtime' and schemaname = 'public'
--    order by tablename;
