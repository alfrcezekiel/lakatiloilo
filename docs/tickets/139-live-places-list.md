# 139 — Live Places list

**What to build:** With /admin/places open, the list updates by itself within a few seconds when a place is added, edited or deleted, or when a review changes a place's review count or stars — like the Reviews and Reports screens. The admin's search, filter, sort, number per page and page are kept.

**Blocked by:** None

**Status:** done

- [x] A place added, edited or deleted in another window shows on an open Places list without a reload
- [x] A new, hidden or deleted review updates that place's "★ 4.3 · 6 reviews" line
- [x] The search text, filter, sort, number per page and page stay as the admin left them
- [x] Coming back to the tab or reconnecting catches up
- [x] Works on the live URL

## Progress (2026-11-13)

- No database change: destinations, accommodations and reviews have been on Supabase's Realtime list since supabase/sql/029, and review_visibility_signals since 041.
- Frontend: the Places list listens to destinations, accommodations, reviews and review_visibility_signals as a doorbell (the rows Realtime sends are never used) and then asks the backend for the list again, after the dashboard's usual 0.2 s quiet time. Coming back to the tab or reconnecting catches up. The search, filter, sort, number per page and page are the screen's own state, so a refresh keeps them; a place that disappears from the last page shows the page before it (as after a delete).
- `npx tsc`, eslint, `npm run build` and the rule searches pass.
- **Not yet checked:** the update itself in the browser. The admin login in the test browser had run out (the dashboard answers "not found" without one), and the agent does not log in; for the team.
- Team check (2026-11-13, localhost): with an admin tab and a traveler tab open, a new review on a mountain destination updated its line on the Places list by itself. Ticked: the review box. Still to confirm: a place added, edited or deleted from another window; the search, filter, sort and page staying; catching up after returning to the tab.
- Team check (2026-11-13, localhost): an edited destination updated by itself on the Places list and on the traveler home page; the search, filter, sort and number per page stayed as they were. "ticked all the boxes in ticket 139". Only the live URL is left (ticket 150).
