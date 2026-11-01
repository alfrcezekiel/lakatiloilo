-- "Helpful" likes on reviews (profiles & likes round, ticket 72).
--
-- A logged-in traveler can mark another traveler's review as helpful, and
-- unmark it. Everyone, logged in or not, can see how many travelers found
-- a review helpful. One like per traveler per review, and nobody can mark
-- their own review.
--
-- The backend reads likes through its own login (lakat_api, see 016 and
-- 023) and adds or removes them as the logged-in traveler, so the
-- policies below decide, exactly like for reviews.
--
-- Nothing here touches the service_role, and Row Level Security stays on.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ------------------------------------------------------

create table if not exists public.review_likes (
    -- The review marked helpful. Deleting the review deletes its likes.
    review_id uuid not null references public.reviews (id) on delete cascade,
    -- Who marked it. Filled in by Supabase from the login, so nobody can
    -- like a review "as" someone else.
    user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
    created_at timestamptz not null default now(),
    -- One like per traveler per review.
    primary key (review_id, user_id)
);

-- 2. What website users may touch at all -------------------------------
--
--   - anyone may read (to count likes),
--   - logged-in travelers may add a like, choosing only the review
--     (user_id and the date are set for them),
--   - they may delete (only their own, see the policy below),
--   - nobody may edit a like.

revoke all on public.review_likes from anon, authenticated;

grant select on public.review_likes to anon, authenticated;

grant insert (review_id) on public.review_likes to authenticated;

grant delete on public.review_likes to authenticated;

-- 3. Row Level Security --------------------------------------------
--
-- Anything without a policy is refused (so there is no update policy).

alter table public.review_likes enable row level security;

create policy "anyone can read review likes" on public.review_likes for
select to anon, authenticated using (true);

-- Only as yourself, and never on your own review.
create policy "travelers can like other travelers' reviews" on public.review_likes for
insert
    to authenticated
with
    check (
        (select auth.uid ()) = user_id
        and not exists (
            select 1
              from public.reviews r
             where r.id = review_id
               and r.user_id = (select auth.uid ())
        )
    );

create policy "travelers can remove their own likes" on public.review_likes for delete to authenticated using (
    (select auth.uid ()) = user_id
);

-- 4. The backend may read likes ----------------------------------------

grant select on public.review_likes to lakat_api;

create policy "api can read review likes"
  on public.review_likes for select
  to lakat_api
  using (true);

-- 5. Check it worked -------------------------------------------------
--
-- Table Editor -> review_likes should NOT show an "RLS disabled" warning.
-- Should list four policies (anyone can read, travelers can like other
-- travelers' reviews, travelers can remove their own likes, api can read):
--   select policyname, cmd, roles from pg_policies where tablename = 'review_likes';
-- Should show rowsecurity = true:
--   select relname, relrowsecurity as rowsecurity from pg_class where relname = 'review_likes';
