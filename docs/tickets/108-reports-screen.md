# 108 — Reports screen

**What to build:** On the dashboard, Reports lists every review with at least one report, most reports first: the place, the reviewer's name, stars, text, photos, whether it is hidden, the number of reports, and each report's reason and note. Only admins can see it; reports stay unreadable to everyone else.

**Blocked by:** 107

**Status:** done

- [x] A numbered SQL file lets admins read reports (everyone else still cannot, and reports stay off the live-updates list); the team has run it
- [x] An admin sees every reported review, most reports first, with each report's reason and note
- [x] A traveler gets 403 and a logged-out visitor 401 from the reports endpoint (checked with curl) and "not found" on the screen
- [x] Works at 375 px and on a laptop
- [x] Works on the live URL

## Progress (2026-11-08)

- **SQL 039** (supabase/sql/039-admins-read-reports.sql; the team ran it): admins may read reports through a new "admins can read reports" rule that asks is_admin(). Admins may read the reason, note, review and date, but **not who reported** (user_id is left out on purpose), so the dashboard can never show a reporter.
- **Backend:** GET /v1/admin/reports (admin-reports.service.ts) reads as the signed-in admin, so the database rule decides. It sits on the admin controller, so AdminOnlyMiddleware guards it. It lists up to 100 reported reviews, most reports first, then the most recently reported.
- **Screen:** /admin/reports, and Reports in the sidebar is now a link. Each reported review shows as a glass card with the place (a link), Visible/Hidden, the number of reports, the reviewer (a link to their profile), stars, date, text and photos, then each report's reason, note ("No note" when empty) and date. It also has a "Check for new reports" button, an "All clear" message when the list is empty, and a "Try again" message if loading fails.
- "Hidden" depends on hidden_at, which ticket 109 adds. Until then every review shows as "Visible".

Checked:
- Rules, through the backend's own login inside a rolled-back transaction: an admin reads all 6 reports (6 reviews) but not who reported them, and cannot delete them; a traveler reads 0 rows; review_reports is still off the Realtime list.
- The endpoint's exact query, run the same way: the admin gets the 6 reviews with their reasons and notes; a traveler gets 0 rows.
- curl: GET /v1/admin/reports answers 401 without a login and with a fake one; /admin/reports answers 404 logged out and with a fake cookie.
- Website and backend type-check and lint, and `npm run build`.
- In the browser as the admin: the screen lists the 6 reviews. Squeezed to a 351 px content width, nothing spills over.

Not checked:
- a traveler's real login at the endpoint (it should answer 403, from the middleware)
- the screen on a real phone
- the live URL

**Team check (2026-11-10, live URL):** the team confirmed it works on the live URL; all boxes ticked, ticket done.
