# 137 — Photo credits round: final check

**What to build:** The team walks through the "Photo credits round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 132, 133, 134, 135, 136, 138 (splash art added to the round on 2026-11-11, team request)

**Status:** in progress

- [ ] Every item in the "Photo credits round" checklist works on the live URL
- [ ] Every new or changed admin endpoint refuses a logged-out visitor (401) and a traveler (403) (checked with curl)
- [ ] Place pages, reviews, the Photo credits page and adding and editing places still work
- [ ] /code-review has been run on the round and its findings handled
- [ ] Works on the live URL

## Progress (2026-11-11)

- /code-review on the round (tickets 132–136, uncommitted): Spec 3 findings, Safety and Standards 3 findings, 0 must-fix. Fixed the same day at the team's request:
  - Spec: the notice line now says it shows when a new photo is chosen or was uploaded; "credits cannot be removed once saved" is in Out of scope and docs/LATER.md (a "Remove credits" button). The "credit" search stays (already in the spec).
  - Standards: supabase/sql/055 (run by the team, "it worked"): only admins and the backend's own login may read place_photo_credits, so the authorization status and the saving admin's account id are no longer readable with the public key. `backend/src/v1/photo-credit.ts` renamed `public-photo-credit.ts` (it was easy to mix up with `admin/photo-credits.ts` and `photo-credits/`). The place form moved to `PlaceForm.tsx` (506 lines, the form only); `AdminPlaceEdit.tsx` is now the Edit page alone (99 lines).
- Proof of 055 (rolled back, nothing kept): 5 policies, the read ones now "admins can read photo credits" (authenticated) and "api can read photo credits" (lakat_api); the backend's login reads both credits; a traveler reads 0 rows; an admin reads both with their status and can still change one. curl after it: a place page 200 with its credit line, GET /v1/photo-credits 2 items.
- **Not yet done:** commit and push (the team said not yet), the live checklist, 403 for a traveler.
