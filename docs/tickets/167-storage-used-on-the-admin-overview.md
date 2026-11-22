# 167 — Storage used on the admin Overview

**What to build:** The admin Overview shows how much of the free plan's
1 GB the photos and videos use ("312 MB of 1 GB"), and turns amber past
80 %, so the team knows before uploads start failing.

**Blocked by:** 165

**Status:** in progress (the team confirmed it on localhost on 2026-11-23; waiting for the live URL check)

- [x] A numbered SQL file adds a read-only function, for admins only, that
      adds up the files in place-photos, review-photos and review-videos,
      and across every bucket (the 1 GB limit counts all of them);
      the team runs it in the Supabase SQL Editor and confirms
- [x] A traveler or a logged-out visitor cannot call it (checked with a
      read-only SQL check, supabase/checks/16, and the API refusal tests in
      backend/test/api/refusals.e2e-spec.ts, which cover every /v1/admin
      route, the Overview included: 401 and 403)
- [x] The Overview shows the used amount and the 1 GB limit, amber from
      80 %, with the colour not the only sign (the words say "nearly full")
- [x] The number matches the Supabase dashboard's storage figure within a
      few MB
- [ ] Works on the live URL

**Progress (2026-11-22):** supabase/sql/067 (admin_storage_used: per bucket
for place-photos, review-photos and review-videos, plus the total across
every bucket, because the 1 GB limit counts all of them; sizes only) and
the read-only supabase/checks/16-storage-used.sql are written. Waiting for
the team to run both before the Overview is built.

**Progress (2026-11-23):** built; the team confirmed every box on localhost
the same day (all but the live URL, which waits for the push).

- The team ran supabase/sql/067; check 16 answered "No rows returned".
- Backend: the Overview answer has storage (used across every bucket,
  the 1 GB limit, and our three buckets). It is read inside a savepoint,
  so if it ever fails only storage shows "can't be read" and the rest of
  the Overview still loads. 2 API tests (the figures; the fallback). The
  Overview route was already in the admin refusal tests: no login 401, a
  traveler 403. curl on the running backend: no login 401, fake login 401.
- Overview: a Storage panel between the tiles and Newest reports — "312
  MB of 1 GB used", a meter screen readers read ("312 MB of 1 GB used,
  30 %"), what uses it (videos, review photos, place photos, other), and
  from 80 % amber plus the words "Nearly full (85 %): …" (at 100 %
  "Full: new photos and videos can't be uploaded. …"). 4 component tests
  and 3 unit tests for the words and levels.
- Backend: types, lint, 69 unit and 225 API tests. Website: types, lint,
  160 tests and the build pass.
- **Not checked:** the Overview with the team's admin login, the number
  against Supabase's own usage figure, and the live URL.

**Code review (2026-11-23):** amber starts at 80 %, and the percent shown is
rounded down, so it never reads "80 %" before the warning shows (79.6 %
reads 79 %); the label says "Every file in the project, free plan", since
the total counts every bucket. The breakdown and the "Full" message are
now in docs/SPEC.md.
