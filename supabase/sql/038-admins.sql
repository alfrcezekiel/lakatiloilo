-- Admins: the Lakat Iloilo team (admin dashboard & moderation round,
-- ticket 107).
--
-- A new admins table lists the accounts that may use the admin
-- dashboard. The team adds and removes rows by hand, here in the SQL
-- Editor (see step 4 below); the app can never make anyone an admin.
--
-- It also defines is_admin(): "is the logged-in person an admin?". The
-- next tickets' rules use it (admins may read reports, hide reviews, edit
-- places, ...). An earlier, rewound attempt left an is_admin function in
-- the database without a file in the repo; this replaces it, so the
-- database can be rebuilt from supabase/sql again.
--
-- Safety: Row Level Security is on, with explicit policies. A logged-in
-- person may read only their own row (so the app can ask "am I an
-- admin?"); nobody may add, change or delete rows through the app, so
-- there are no write permissions or write policies at all. is_admin()
-- runs as "security definer" only to look itself up, uses
-- search_path = '' and full table names, and answers only true or false
-- about the person asking. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ------------------------------------------------------
create table if not exists public.admins (
    -- The admin's account. Removing the account removes the row.
    user_id uuid primary key references auth.users (id) on delete cascade,
    created_at timestamptz not null default now()
);

-- 2. What website users may touch at all ------------------------------
--
--   - logged-in people may read (only their own row, see below),
--   - nobody may add, change or delete rows through the app.
revoke all on public.admins from anon, authenticated;
grant select on public.admins to authenticated;

-- 3. Row Level Security --------------------------------------------
--
-- Anything without a policy is refused (so no insert, update or delete
-- policy).
alter table public.admins enable row level security;

drop policy if exists "people can read their own admin row" on public.admins;
create policy "people can read their own admin row"
  on public.admins for select
  to authenticated
  using ((select auth.uid ()) = user_id);

-- "Is the logged-in person an admin?" Used by the backend and by the
-- next tickets' policies.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (select 1 from public.admins where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- 4. Adding the first admin (the team's manager) ------------------------
--
-- NOT run by this file: the email must not be saved in the project.
-- After running the steps above, open a NEW query. Type the lines below
-- WITHOUT the "--" at the start of each line (with them, Supabase treats
-- the lines as comments, runs nothing, and still says "Success"), put the
-- manager's login email between the quotes, and Run.
--
-- a) Find the manager's account (type part of the email between the % signs):
--
--   select id, email, created_at from auth.users where email ilike '%part-of-the-email%';
--
--    No rows: the manager must sign up on the website first.
--
-- b) Add it. "returning" makes Supabase show the row it added; running it
--    twice changes nothing.
--
--   insert into public.admins (user_id)
--   select id from auth.users where lower(email) = lower('manager@example.com')
--   on conflict (user_id) do nothing
--   returning user_id;
--
--    One row shown: done. "No rows returned": the email in the quotes does
--    not match an account (copy it exactly from step a), or that account
--    is already an admin.
--
-- c) Check:
--
--   select a.user_id, u.email, a.created_at
--     from public.admins a join auth.users u on u.id = a.user_id;
--
-- To remove an admin later:
--
--   delete from public.admins
--    where user_id = (select id from auth.users where lower(email) = lower('manager@example.com'));

-- 5. Check it worked -------------------------------------------------
--
-- Table Editor -> admins should NOT show an "RLS disabled" warning.
--
-- Should list one policy (people can read their own admin row):
--   select policyname, cmd, roles from pg_policies where tablename = 'admins';
--
-- Should show rowsecurity = true:
--   select relname, relrowsecurity as rowsecurity from pg_class where relname = 'admins';
--
-- Should answer false (you are not logged in in the SQL Editor):
--   select public.is_admin();
