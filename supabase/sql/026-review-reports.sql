-- Reporting a review (review extras round, ticket 80).
--
-- A logged-in traveler can report another traveler's review with a reason
-- (spam, offensive, not about this place, other) and an optional note.
-- One report per traveler per review. Nothing is hidden automatically.
--
-- Nobody may read reports through the app: not visitors, not travelers,
-- and not the backend's own login (lakat_api). The team reads them in the
-- Supabase dashboard (Table Editor -> review_reports), which uses the
-- dashboard's own access, not the website's.
--
-- The backend adds reports as the logged-in traveler, so the policy below
-- decides.
--
-- Nothing here touches the service_role, and Row Level Security stays on.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ------------------------------------------------------

create table if not exists public.review_reports (
    id uuid primary key default gen_random_uuid (),
    -- The reported review. Deleting the review deletes its reports.
    review_id uuid not null references public.reviews (id) on delete cascade,
    -- Who reported it. Filled in by Supabase from the login, so nobody can
    -- report "as" someone else.
    user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
    reason text not null check (
        reason in ('spam', 'offensive', 'not_about_place', 'other')
    ),
    -- Optional, up to 300 characters.
    note text check (
        note is null or char_length(note) <= 300
    ),
    created_at timestamptz not null default now(),
    -- One report per traveler per review.
    unique (review_id, user_id)
);

-- 2. What website users may touch at all -------------------------------
--
--   - nobody may read (no "grant select", and no read policy below),
--   - logged-in travelers may add a report, choosing only the review, the
--     reason and the note (user_id, id and date are set for them),
--   - nobody may edit or delete a report through the app.

revoke all on public.review_reports from anon, authenticated;

grant insert (review_id, reason, note) on public.review_reports to authenticated;

-- 3. Row Level Security --------------------------------------------
--
-- Only one policy: adding a report as yourself, never on your own review.
-- Anything without a policy is refused, so reading, editing and deleting
-- are refused for everyone using the website.

alter table public.review_reports enable row level security;

create policy "travelers can report other travelers' reviews" on public.review_reports for
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

-- 4. Check it worked -------------------------------------------------
--
-- Table Editor -> review_reports should NOT show an "RLS disabled" warning.
-- Should list exactly one policy (travelers can report other travelers'
-- reviews, cmd INSERT):
--   select policyname, cmd, roles from pg_policies where tablename = 'review_reports';
-- Should show rowsecurity = true:
--   select relname, relrowsecurity as rowsecurity from pg_class where relname = 'review_reports';
