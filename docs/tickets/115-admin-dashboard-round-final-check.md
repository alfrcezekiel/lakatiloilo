# 115 — Admin dashboard & moderation round: final check

**What to build:** The team walks through the "Admin dashboard & moderation round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 107, 108, 109, 110, 111, 112, 113, 114

**Status:** done

- [x] Every item in the "Admin dashboard & moderation round" checklist works on the live URL
- [x] Every admin endpoint refuses a logged-out visitor (401) and a traveler (403) (checked with curl)
- [x] Reviews, replies, photos, reports, Helpful likes, notifications, profiles and log-in still work for travelers
- [x] /code-review has been run on the round and its findings handled
- [x] Works on the live URL

## Progress (2026-11-09, before the push)

Checked on localhost:
- **curl, logged out and with a fake login:** every admin endpoint answers 401. These are me, overview, reports, keep/hide/delete, and the places list, read and save.
- **Pages:** /admin, /admin/reports, /admin/places, an Edit page and /admin/anything answer 404; /admin/login answers 200.
- **RLS** is on for all 12 public tables, including admins, notifications, reply_likes, review_photos, destinations, accommodations, report_signals and review_visibility_signals.
- **Realtime list:** review_reports is not on it.
- **Secrets:** no key-shaped value (sb_secret_… or a JWT) anywhere in the repo, and no .env file is tracked. "service_role" appears only in comments that say it is never used.
- **A traveler's login is refused** (403) by AdminOnlyMiddleware through is_admin(), proven in the database for tickets 107–112. The team can also check it in the browser (see the report).

Still to do: /code-review on the round, then "commit and push", then the live checklist in the spec on a laptop and a phone.

**Code review (2026-11-09), findings fixed:**
- **Spec 1:** the bell's unread number now counts only notifications whose review is still visible, matching the list. A reply-answer under a hidden review used to leave a number with nothing to click. Proved in a rolled-back transaction: the old count was 5, while the list showed 4 and the new count says 4.
- **Spec 2:** the docs now say 401 for a logged-out visitor and 403 for a traveler (SPEC, tickets 108, 111, 115).
- **Spec 3:** the small extras (Places filter buttons, "Check for new reports", jumping from a newest report, "on N reviews") are written into the spec.
- **🟡 1:** Keep it / Hide it / Delete review moved out of AdminReports.tsx into ModerationButtons.tsx (383 lines became 227 + 147).
- **🟡 2:** one shared AdminLoadError panel and the plural, errorMessage and REPORTS_KEY helpers (admin-ui.tsx), used by Overview, Reports, Places and Edit place.
- **🟡 3:** the review form treats an already-removed photo by its 404 status, not by the message text.
- **🟡 5:** the stale single-photo comment in travelers.module.ts is updated.
- Left as they are, on purpose: the public signal tables (they hold no content and logged-out pages need them), and api.ts's size (the project rule keeps every backend call there).

Checked: type-check and lint (website and backend), `npm run build`, curl (the notifications and admin endpoints still answer 401 without a login).

**Second code review (2026-11-09, after the push), findings fixed:**
- **Spec 1:** the admin 404 after the cookie ran out (see the fix note in ticket 107).
- **🟡 1:** adding and removing review photos moved out of reviews.service.ts (460 → 383 lines) into review-photo-uploads.service.ts; the endpoints are unchanged.

Checked: type-check and lint (website and backend), `npm run build`, and curl (place reviews 200 with their photos; the photo endpoints 401 without a login; /admin 404 logged out).

**Team check (2026-11-10, live URL):** the team confirmed it works on the live URL; all boxes ticked, ticket done.
