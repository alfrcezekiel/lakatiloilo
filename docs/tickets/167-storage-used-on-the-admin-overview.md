# 167 — Storage used on the admin Overview

**What to build:** The admin Overview shows how much of the free plan's
1 GB the photos and videos use ("312 MB of 1 GB"), and turns amber past
80 %, so the team knows before uploads start failing.

**Blocked by:** 165

**Status:** todo

- [ ] A numbered SQL file adds a read-only function, for admins only, that
      adds up the files in place-photos, review-photos and review-videos;
      the team runs it in the Supabase SQL Editor and confirms
- [ ] A traveler or a logged-out visitor cannot call it (checked with a
      read-only SQL check and an API test: 401 and 403)
- [ ] The Overview shows the used amount and the 1 GB limit, amber past
      80 %, with the colour not the only sign (the words say "nearly full")
- [ ] The number matches the Supabase dashboard's storage figure within a
      few MB
- [ ] Works on the live URL
