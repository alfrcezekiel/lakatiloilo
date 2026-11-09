# 109 — Keep it, Hide it, Delete review

**What to build:** Each reported review on the Reports screen gets three buttons. Keep it removes its reports and shows it again; Hide it hides it; Delete review (after a "Yes, delete" step) deletes it with its replies, likes, photos and notifications. A hidden review disappears from the place page, the ratings and the reviewer's public profile; its writer still sees it on the place page with a grey note: "Hidden while the team reviews it."

**Blocked by:** 108

**Status:** todo

- [x] A numbered SQL file adds hidden_at to reviews, changes who may read hidden reviews (the writer and admins only), lets only admins hide, unhide and delete any review, and lets admins delete reports; the team has run it
- [x] Keep it, Hide it and Delete review all work, and the list updates at once
- [x] A hidden review is gone from the place page, the rating and the profile for everyone else; its writer sees "Hidden while the team reviews it."
- [x] A traveler cannot hide or unhide a review, not even their own (refused by the database)
- [ ] Works on the live URL

## Progress (2026-11-08)

- **SQL 040** (supabase/sql/040-hide-reviews.sql; the team ran it):
  - reviews.hidden_at
  - read rules: logged out sees visible reviews only; logged in sees visible + their own + all for admins; the backend's own login (lakat_api) sees visible only, so the place page, the ratings and public profiles drop hidden reviews by themselves
  - admins may hide/show and delete any review, delete its photo in Storage, and delete reports
  - the review trigger refuses anyone but an admin changing hidden_at, refuses an admin changing someone's stars, text or photo, and keeps updated_at when hiding (never "edited")
- **Backend:**
  - POST /v1/admin/reviews/:id/keep (removes its reports, shows it again)
  - POST /v1/admin/reviews/:id/hide
  - DELETE /v1/admin/reviews/:id (with its photo)
  - all on the admin controller, so AdminOnlyMiddleware guards them; all run as the admin, so the database decides
  - GET /v1/reviews also returns the logged-in traveler's own hidden review, read as them, with hidden: true
  - GET /v1/admin/reports now shows the real Hidden status
- **Website:**
  - Reports cards have Keep it / Hide it / Delete review, and Delete asks "Yes, delete" first
  - the list changes at once; a status line says what happened and takes the focus
  - on the place page the writer sees "Hidden while the team reviews it." on their hidden review, and it does not count toward the rating

Checked:
- **Rules**, through the backend's own login in a rolled-back transaction:
  - the writer cannot hide or unhide their own review (refused); another traveler changes nothing
  - the admin hides it, and updated_at stays the same
  - the backend login and other travelers then see 0 rows; the writer and the admin see it
  - the admin cannot change its text (refused)
  - a traveler cannot delete its reports or the review (0 rows); the admin can delete the reports, show it again and delete the review
- **curl:** keep / hide / delete answer 401 without a login and with a fake one; the DELETE preflight answers 204
- Type-check, lint and `npm run build` for the website and backend

Not checked (the test browser was no longer signed in as admin, and these change real data):
- pressing the three buttons
- the writer's grey note
- a traveler's login at these endpoints (403)
- the live URL

**Change (2026-11-08, team request):** hiding a review must show on open pages without a reload. The cause: Supabase Realtime only announces a change to people who may still read the row, and after hiding nobody but the writer and the team may, so open pages were never told. Fix: supabase/sql/041 adds review_visibility_signals, a read-only table that gets a row (only the place, never the review) whenever a review is hidden or shown again. It is on the Realtime list, and the place page and the home page listen to it as a doorbell, then ask the backend again.

**Team check (2026-11-08, localhost):** the team ran 041. Keep it, Hide it and Delete review all work from the Reports screen, and the change shows in real time, without a reload, in an incognito (logged-out) window and in a normal tab. Still to confirm: the writer's grey note "Hidden while the team reviews it.", and the live URL.
