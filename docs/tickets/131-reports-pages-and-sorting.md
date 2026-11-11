# 131 — Reports: pages and sorting

**What to build:** The Reports screen gets Sort (⏱ Recently added = newest report first, ✦ Most relevant = most reports, ★ Top-rated = most stars) and Show 10 / 25 / 50 at the top, and numbered pages at the bottom. The pages are made in the browser (the reported reviews are already loaded, up to 100).

**Blocked by:** 129

**Status:** in progress

- [x] Sort and Show change the Reports list; Previous, Next and the page numbers move through it, and "Showing … of N" is right
- [x] Keep it, Hide it, Delete review with Undo, and the live updates still work on any page
- [x] Works with the keyboard alone, at 375 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-11)

- No backend change: the reported reviews are already loaded (up to 100), so `AdminReports.tsx` sorts and pages them in the browser with the shared Sort, Show 10/25/50 and pages from ticket 129. Recently added = newest report first; Most relevant = most reports; Top-rated = most stars; ties by newest report, then id. The screen opens on Most relevant (the order Reports always had). "Showing 11–18 of 18 reported reviews."; a new sort or number per page goes back to page 1; a delete that empties the last page shows the page before; moving to a page focuses the "Showing" line. A link from the Overview to one reported review (#reported-<id>) opens the page it is on.
- Phones: Keep it / Hide it / Delete as three equal buttons with the icon above the label ("Delete review" reads "Delete" on phones; screen readers hear "Delete review: <reviewer>'s review of <place>"); "Check for new reports" fills its row.
- Checked in the browser with the team's admin login (only reading): opens on Most relevant, 1–10 of 18, 3, 2, 2, 1 … reports in order; page 2 → 11–18 with the focus on the "Showing" line; Top-rated → 5-star first; Show 25 → all 18, no pages; a fresh visit to a link to the 16th reported review → page 2 (11–18), that review scrolled into view and focused. Pop-ups at 425, 375 and 320 px: Sort, Show and pages each on one line; Keep it / Hide it / Delete three equal buttons on one line, labels fit (74 × 56 at 320); "Check for new reports" fills its row; nothing wider than the screen.
- `npx tsc`, eslint, `npm run build` and the frontend rule searches pass.
- **Not yet checked:** Keep it, Hide it and Delete with Undo on page 2, a new report arriving live while on page 2, the keyboard alone — for the team to test.
- Team check (2026-11-11, localhost): sorting, pages, Keep it / Hide it / Delete with Undo and the live updates in another window confirmed ("ticked all the boxes of ticket 131"). Only the live URL is left (ticket 128).
