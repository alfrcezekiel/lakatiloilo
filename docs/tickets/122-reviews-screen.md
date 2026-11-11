# 122 — Reviews screen

**What to build:** The dashboard gets a Reviews screen: every review, newest first, 50 at a time with "Show more", a search box (review text, reviewer's name or place) and All / Hidden / Reported buttons. Each review shows the place, the reviewer, stars, text, photos, its Helpful count and Visible or Hidden.

**Blocked by:** None

**Status:** in progress

- [x] An admin sees every review, hidden ones included, finds one by searching, and narrows the list with All / Hidden / Reported
- [x] "Show more" loads the next 50
- [x] A traveler or a logged-out visitor gets 403 or 401 from the endpoint (checked with curl) and "not found" on the screen
- [x] Works with the keyboard alone, at 375 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-10)

- No database change: admins can already read every review, hidden ones too (040), and report counts (039).
- Backend: `GET /v1/admin/reviews?q=&show=all|hidden|reported&before=` (`admin-reviews.service.ts`) → `{ reviews, total, next }`, 50 per page, newest first. Each review has its place, reviewer, stars, text, photos, Helpful, report and reply counts and hidden. The search matches the review text, reviewer's name or place's name, as written (a "%" finds only "%"). "Show more" sends back `next`, the last review's exact time and id, so no review is skipped or repeated. Plain 400s for a wrong filter, a broken `before` or a search over 100 characters.
- Checked against the real data as the admin, read-only and rolled back: 165 reviews over 4 pages, none repeated, newest first, the same count as the table; Hidden 1 (all hidden); Reported 17 (all with reports); "Bella" 9 (all match); a place's name finds its reviews.
- Frontend: `/admin/reviews` (Reviews in the sidebar). Search box (waits 0.3 s after typing, keeps the old list until the answer), All / Hidden / Reported, a status line ("165 reviews, newest first. Showing 50."), cards like the Reports screen, and "Show more" (the focus moves to the first new review).
- Checked in the browser with the team's admin login (only reading): 50 cards, Show more → 100 with the focus on review 51, Hidden 1, Reported 17, "Bella" 9. curl: the endpoint answers 401 without a login and with a fake one; `/admin/reviews` answers 404 without an admin login.
- `npx tsc`, eslint, backend `tsc --noEmit` and `npm run build` pass.
- Team check (2026-11-10, localhost): "ticked all the boxes of ticket 122" (search, filters, Show more, keyboard, 375 px, not found for travelers).
- **Not yet checked:** the live URL.
