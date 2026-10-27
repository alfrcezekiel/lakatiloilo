-- The backend reads and writes reviews with TypeORM (backend round,
-- tickets 49 and 50), through its own database login, lakat_api (016).
--
-- Reading: lakat_api may read reviews, like destinations and
-- accommodations. Reviews hold no email addresses.
--
-- Writing: Row Level Security must still decide who may add or change a
-- review, exactly as when the website talked to Supabase directly. So for
-- each write the backend first checks the traveler's login token with
-- Supabase Auth, then, inside one transaction, tells the database which
-- traveler it is and switches to Supabase's "authenticated" role. The
-- reviews policies from 020 then check auth.uid() as before.
--
-- For that, lakat_api must be allowed to switch to "authenticated". It is
-- made NOINHERIT first, so being allowed to switch does not quietly give
-- lakat_api the authenticated role's rights the rest of the time: outside
-- that switch it keeps only its own rights from 016 and this file.
--
-- Nothing here touches the service_role, and Row Level Security stays on.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Reading reviews -------------------------------------------------

grant select on public.reviews to lakat_api;

create policy "api can read reviews"
  on public.reviews for select
  to lakat_api
  using (true);

-- 2. Acting as a logged-in traveler, only when switched on purpose -----

alter role lakat_api noinherit;
grant authenticated to lakat_api;

-- 3. Check it worked ----------------------------------------------------
--
-- Should show rolinherit = false and rolbypassrls = false:
--   select rolname, rolinherit, rolbypassrls from pg_roles where rolname = 'lakat_api';
-- Should list "api can read reviews" among the reviews policies:
--   select policyname, roles from pg_policies where tablename = 'reviews';
