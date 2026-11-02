-- Replies on reviews (review extras round, ticket 79).
--
-- Anyone, logged in or not, can read the replies under a review. A
-- logged-in traveler can reply (1 to 300 characters) and delete their own
-- replies. No one can edit a reply, and there are no replies to replies.
--
-- Like reviews, the replier's name and traveler type are copied from
-- their account by the database (the trigger below), so they can never be
-- typed in from the browser.
--
-- The backend reads replies through its own login (lakat_api, see 016 and
-- 023) and adds or deletes them as the logged-in traveler, so the policies
-- below decide.
--
-- Nothing here touches the service_role, and Row Level Security stays on.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ------------------------------------------------------

create table if not exists public.review_replies (
    id uuid primary key default gen_random_uuid (),
    -- The review replied to. Deleting the review deletes its replies.
    review_id uuid not null references public.reviews (id) on delete cascade,
    -- Who replied. Filled in by Supabase from the login, so nobody can
    -- reply "as" someone else.
    user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
    -- Copied from the account by the trigger below, like on reviews.
    replier_name text not null default '',
    traveler_type text check (
        traveler_type in ('local', 'domestic', 'foreign')
    ),
    comment text not null check (
        char_length(btrim (comment)) between 1 and 300
    ),
    created_at timestamptz not null default now()
);

-- Makes "this review's replies, oldest first" fast.
create index if not exists review_replies_review_idx on public.review_replies (review_id, created_at);

-- 2. Filled in by the database, not by the browser -------------------
--
-- Runs before every new reply: copies the replier's display name and
-- traveler type from their account (the same rules as reviews in 022) and
-- sets created_at. "security definer" lets it read the account
-- (auth.users), which normal website users cannot see. search_path = ''
-- and full table names stop anyone from tricking it into using a
-- look-alike table.

create or replace function public.review_replies_before_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  select coalesce(
           nullif(left(btrim(u.raw_user_meta_data ->> 'display_name'), 40), ''),
           'Traveler'
         ),
         case
           when u.raw_user_meta_data ->> 'traveler_type' in ('local', 'domestic', 'foreign')
             then u.raw_user_meta_data ->> 'traveler_type'
         end
    into new.replier_name, new.traveler_type
    from auth.users u
   where u.id = new.user_id;

  new.created_at := now();
  return new;
end;
$$;

create trigger review_replies_before_insert
  before insert on public.review_replies
  for each row execute function public.review_replies_before_insert();

-- 3. What website users may touch at all -------------------------------
--
--   - anyone may read,
--   - logged-in travelers may add a reply, choosing only the review and
--     the text (user_id, name, type and date are set for them),
--   - they may delete (only their own, see the policy below),
--   - nobody may edit a reply.

revoke all on public.review_replies from anon, authenticated;

grant select on public.review_replies to anon, authenticated;

grant insert (review_id, comment) on public.review_replies to authenticated;

grant delete on public.review_replies to authenticated;

-- 4. Row Level Security --------------------------------------------
--
-- Anything without a policy is refused (so there is no update policy).

alter table public.review_replies enable row level security;

create policy "anyone can read review replies" on public.review_replies for
select to anon, authenticated using (true);

create policy "travelers can add their own replies" on public.review_replies for
insert
    to authenticated
with
    check ((select auth.uid ()) = user_id);

create policy "repliers can delete their own replies" on public.review_replies for delete to authenticated using (
    (select auth.uid ()) = user_id
);

-- 5. The backend may read replies --------------------------------------

grant select on public.review_replies to lakat_api;

create policy "api can read review replies"
  on public.review_replies for select
  to lakat_api
  using (true);

-- 6. Check it worked -------------------------------------------------
--
-- Table Editor -> review_replies should NOT show an "RLS disabled" warning.
-- Should list four policies (anyone can read, travelers can add their own
-- replies, repliers can delete their own replies, api can read):
--   select policyname, cmd, roles from pg_policies where tablename = 'review_replies';
-- Should show rowsecurity = true:
--   select relname, relrowsecurity as rowsecurity from pg_class where relname = 'review_replies';
