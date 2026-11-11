# 128 — Full admin management round: final check

**What to build:** The team walks through the "Full admin management round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 129, 130, 131 (pages and sorting added to the round on 2026-11-11, team request)

**Status:** in progress

- [ ] Every item in the "Full admin management round" checklist works on the live URL
- [ ] Every new admin endpoint refuses a logged-out visitor (401) and a traveler (403) (checked with curl)
- [ ] Places, reviews, replies, photos, reports, Helpful likes, notifications and log-in still work for travelers
- [ ] /code-review has been run on the round and its findings handled
- [ ] Works on the live URL

## Progress (2026-11-11)

- curl, logged out and with a fake login: all 19 new admin endpoints answer 401; /admin/reviews, /admin/places/new, /admin/places, /admin/reports answer 404 without an admin login; GET /v1/categories (public) answers 200. The 403-for-a-traveler half needs a real traveler login (team).
- /code-review on the whole round (everything since 2210877): Spec 3 findings, Safety and Standards 6 findings, 0 must-fix. All fixed the same day at the team's request:
  - Spec: the endpoint line now puts review_count on GET /v1/admin/places (the list, where Delete is) and the unused review_count was removed from the single-place answer; the Data section now says a new place must have a photo and a description (050).
  - Standards: the Add a place page moved to `AdminPlaceNew.tsx`, the form's fields and checks to `place-form-fields.ts` and its photo to `PlacePhotoField.tsx` (AdminPlaceEdit.tsx 761 → 537 lines); the review buttons to `ReviewActions.tsx` (AdminReviews.tsx 535 → 378); the unused "gone" focus branch removed; `ADMIN_LIVE_QUIET_MS` and `ADMIN_REVIEWS_KEY` moved to `admin-ui.tsx`; the waiting-delete keys are one set per change; the four copies of the database-error mapping replaced by `backend/src/v1/database-errors.ts` (checked on real refusals, rolled back: duplicate category 409, category in use 409, traveler 403 — the same sentences as before).
- Team requests the same day: no black backdrop on dashboard cards (no blur or big shadow on `adminGlass`, solid phone top bar, keyboard-only card outlines); "Categories" in the sidebar (ticket 116); the no-white-hover rule moved into `.claude/rules/frontend.md` with a new "No black backdrop on the admin dashboard" section (the old rule file is removed).
- **Not yet done:** commit and push, the live checklist, and the travelers' side on the live URL.
