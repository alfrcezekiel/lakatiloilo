# 137 — Photo credits round: final check

**What to build:** The team walks through the "Photo credits round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 132, 133, 134, 135, 136, 138 (splash art added to the round on 2026-11-11, team request)

**Status:** done

- [x] Every item in the "Photo credits round" checklist works on the live URL
- [x] Every new or changed admin endpoint refuses a logged-out visitor (401) and a traveler (403) (checked with curl)
- [x] Place pages, reviews, the Photo credits page and adding and editing places still work
- [x] /code-review has been run on the round and its findings handled
- [x] Works on the live URL

## Progress (2026-11-11)

- /code-review on the round (tickets 132–136, uncommitted): Spec 3 findings, Safety and Standards 3 findings, 0 must-fix. Fixed the same day at the team's request:
  - Spec: the notice line now says it shows when a new photo is chosen or was uploaded; "credits cannot be removed once saved" is in Out of scope and docs/LATER.md (a "Remove credits" button). The "credit" search stays (already in the spec).
  - Standards: supabase/sql/055 (run by the team, "it worked"): only admins and the backend's own login may read place_photo_credits, so the authorization status and the saving admin's account id are no longer readable with the public key. `backend/src/v1/photo-credit.ts` renamed `public-photo-credit.ts` (it was easy to mix up with `admin/photo-credits.ts` and `photo-credits/`). The place form moved to `PlaceForm.tsx` (506 lines, the form only); `AdminPlaceEdit.tsx` is now the Edit page alone (99 lines).
- Proof of 055 (rolled back, nothing kept): 5 policies, the read ones now "admins can read photo credits" (authenticated) and "api can read photo credits" (lakat_api); the backend's login reads both credits; a traveler reads 0 rows; an admin reads both with their status and can still change one. curl after it: a place page 200 with its credit line, GET /v1/photo-credits 2 items.
- **Not yet done:** commit and push (the team said not yet), the live checklist, 403 for a traveler.

- Committed and pushed (2026-11-11): 5085a96, tickets 116–138 with SQL 047–055 (all already run on Supabase). Left out: .claude/launch.json and the five splash files the site does not use. Next: the live checklist.
- Live check (2026-11-12, team): "it operates efficiently in live URL". The team confirmed on the live site: travelers see the splash art on places until their photo credits are allowed; /admin/login works; adding a place; reviews (view, hide, show, delete); reports (keep, hide, delete); Undo after deleting reviews, places, replies and likes; adding categories; sorting on Reviews, Reports and Places; phone widths; a traveler cannot open the /admin pages.
- curl on the live backend (2026-11-12), logged out and with a fake login: PUT …/credits, POST places, GET places, GET one place, GET reviews, DELETE a reply, GET categories → all 401. The live site's /admin/places, /admin/reviews and /admin/categories → 404 without an admin login. Public answers: GET /v1/photo-credits 2 items and GET /v1/destinations 31 places (2 with a photo), neither with the authorization status.
- Also confirmed by the team on the live URL (2026-11-12): editing every field and the photo (PDF refused), live updates from another window, the photo credits refusals, and the credit line on /credits. Round done.

## Code review of both rounds (2026-11-12, 2210877..6cbb07e)

Spec 2 findings, Safety and Standards 4 findings, 0 must-fix. All fixed the same day at the team's request (not committed yet):
- Spec: the credits box now says travelers see the splash art until the status is something other than "Not checked yet" (ticket 138's last box; the sentence had been lost); docs/PHOTO-CREDITS.md rewritten for how credits work now (dashboard box, splash rule, "Credit missing", where travelers see credits).
- Standards: the "allowed photo" rule is one function (`photoAllowedSql` in backend/src/v1/public-photo-credit.ts), used by the public photo and credit line, the Photo credits page and "Credit missing" (checked: the same two places, Mt. Lingguhob and test, are credited in the list and show their photo); the splash art's address is one constant (`SPLASH_ART` in src/lib/splash.ts); the splash art is the team's WebP copy of the same 1920 × 1080 art (`public/splash-desktop-1920x1080.webp`, 257 KB instead of 2.2 MB; home page 40 splash images loaded at 1920 × 1080, none broken; the place page shows it in the same frame); long files split: the place types and form checks moved from admin-places.service.ts (416 → 285 lines) to place-changes.ts, and the place's fields from PlaceForm.tsx (506 → 356) to PlaceDetailsFields.tsx.
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` and the rule searches pass; curl: admin endpoint 401 logged out, photo-credits 2, destinations 2 of 31 with a photo.
