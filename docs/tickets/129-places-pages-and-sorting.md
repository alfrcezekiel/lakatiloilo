# 129 — Places: pages and sorting

**What to build:** The Places list gets Sort (⏱ Recently added, ✦ Most relevant = most reviews, ★ Top-rated = highest average stars, places with no reviews last) and Show 10 / 25 / 50 at the top, and numbered pages at the bottom ("Showing 1–10 of 37", ‹ Previous · 1 2 3 4 · Next ›). The search and the All / Destinations / Accommodations buttons still work and go back to page 1. The pages are made in the browser (every place is already loaded); the backend's list also answers each place's created_at and average_rating.

**Blocked by:** None

**Status:** in progress

- [x] Sort and Show change the Places list; Previous, Next and the page numbers move through it, and "Showing … of N" is right
- [x] Searching or changing a filter goes back to page 1, and Delete with Undo still works on any page
- [x] Works with the keyboard alone, at 375 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-11)

- Backend: `GET /v1/admin/places` also answers `created_at` and `average_rating` (the average of the reviews travelers see, 2 decimals, null without any). Checked on real data (read-only, rolled back): 37 places, 34 with a rating; Breakthrough Restaurant 4.33, the same as the site's visible average.
- `ListControls.tsx` (new, shared with tickets 130 and 131): Sort with ⏱ Recently added, ✦ Most relevant, ★ Top-rated (buttons with aria-pressed), Show 10 / 25 / 50 per page (a labelled list), "Showing 11–20 of 37 places.", and ‹ Previous · 1 2 … 4 · Next › (aria-current on the page, hidden when everything fits).
- Places list: sorted and paged in the browser. Recently added = newest first; Most relevant = most reviews; Top-rated = highest average, places without reviews last; ties by newest, then name. Each row shows "★ 4.3 · 6 reviews" (or "No reviews yet"). A new search, filter, sort or number per page goes back to page 1; a delete that empties the last page shows the page before. Moving to a page focuses the "Showing …" line.
- Checked in the browser with the team's admin login (only reading): 1–10 of 37 with 1 2 … 4; Next → 11–20 and the focus on the "Showing" line; Top-rated → page 1, 5.0 first, "No reviews yet" last, in order; Show 50 → all 37, no page buttons; Most relevant → 10, 9 … reviews, in order; from page 3, searching "iloilo city" → page 1, "1–10 of 22 (22 of 37 match)".
- `npx tsc`, eslint, backend `tsc --noEmit`, `npm run build` and the frontend rule searches pass.

**Fix (2026-11-11, team report):** "rectify the buttons of /admin/places in dimensions of mobile … misalignment … in 425px, 375px and 320px in sorting buttons, find a place buttons and paginations buttons." Root cause: each row of buttons was a wrapping row of pills sized to their text, so on phones they broke into uneven rows (Sort: one button next to "Sort", two under it; filters: "Accommodations" alone; pages: Previous 1 2 … / 4 Next on two or three rows; Edit and Delete small on the left). Now, below 640 px: "Sort" on its own line and three equal buttons with the icon above the label; Show fills its line; the filters one full row (each as wide as its name plus an equal share; a touch smaller text below 360 px; "All" at least 44 px); pages "‹ Previous · Page 1 of 4 · Next ›" in one row (numbers from 640 px); Edit and Delete two equal halves. From 640 px everything is as before. Measured in a pop-up resized to 425, 375 and 320 px: every row on one line, nothing wider than the screen, the filter names fit (44/82/105 px at 320), Sort 3 × 88 px at 320, Edit/Delete 2 × 107 px at 320.

- Team check (2026-11-11, localhost): "ticked all boxes of ticket 129."
- **Not yet checked:** the live URL.
