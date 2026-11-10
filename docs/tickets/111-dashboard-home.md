# 111 — Dashboard home

**What to build:** The dashboard's Overview shows four glass stat tiles — reviews this week, reports waiting, hidden reviews, places listed — and under them the 5 newest reports, each opening the Reports screen.

**Blocked by:** 109

**Status:** done

- [x] The four tiles show the right numbers (checked against the database)
- [x] The 5 newest reports show and each opens the Reports screen
- [x] A traveler gets 403 and a logged-out visitor 401 from the overview endpoint (checked with curl)
- [x] Works with the keyboard alone, at 375 px and on a laptop
- [x] Works on the live URL

## Progress (2026-11-08)

- **Backend:** GET /v1/admin/overview (admin-overview.service.ts). It is read as the signed-in admin, so the database decides; it sits on the admin controller, so AdminOnlyMiddleware guards it.
  - "Reviews this week" means the last 7 days, hidden reviews included.
  - "Reports waiting" also says how many reviews the reports are on.
- **Screen:** the Overview's welcome panel is replaced by four glass tiles (2 across on phones, 4 on laptops) and a "Newest reports" panel.
  - Each newest report shows its reason, the reviewer's name, the place, the note and how long ago it came in.
  - Each one opens /admin/reports#reported-<review id>; the Reports screen scrolls to that review and outlines it in amber once it has loaded.

Checked:
- The endpoint's own queries, run as the admin in a rolled-back transaction, match separate counts: 56 reviews this week, 5 reports waiting on 3 reviews, 1 hidden, 34 places, and the 5 newest reports.
- The same queries as a traveler give 0 reports, 0 hidden and no newest reports.
- curl: 401 without a login and with a fake one.
- Website and backend type-check and lint, and `npm run build`.

Not checked: the screen in the browser (the test browser is no longer signed in as admin), a traveler's login at the endpoint (403), the keyboard, 375 px, and the live URL.

**Team check (2026-11-08, localhost):** the four tiles and the newest reports show on the Overview, each newest report opens Reports, and it works with the keyboard, at 375 px and on a laptop. Still open: the live URL.

**Change (2026-11-09, team request):** the Overview updates live, without a reload. It listens with Supabase Realtime to reviews, review_visibility_signals (041) and a new report_signals table (supabase/sql/045: one row holding only a time whenever reports are added or removed), then asks GET /v1/admin/overview again. review_reports itself stays off the Realtime list.

**Team check (2026-11-09, localhost):** the team ran 045; the Overview updates live without a reload.

**Team check (2026-11-10, live URL):** the team confirmed it works on the live URL; all boxes ticked, ticket done.
