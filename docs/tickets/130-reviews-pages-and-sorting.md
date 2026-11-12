# 130 — Reviews: pages and sorting

**What to build:** The Reviews screen gets Sort (⏱ Recently added, ✦ Most relevant = most Helpful marks plus replies, ★ Top-rated = most stars, then newest) and Show 10 / 25 / 50 at the top, and numbered pages at the bottom instead of "Show more". The backend makes the pages: GET /v1/admin/reviews takes sort, per_page and page and answers { reviews, total, page, per_page }.

**Blocked by:** 129

**Status:** done

- [x] Sort and Show change the Reviews list; Previous, Next and the page numbers move through it, and "Showing … of N" is right
- [x] Search, All / Hidden / Reported, replies, Helpful lists, Hide / Show / Delete and Undo still work on any page; a change from another window updates the page without moving it
- [x] A wrong sort, number per page or page answers 400 with a plain sentence (checked with curl)
- [x] Works with the keyboard alone, at 375 px and on a laptop
- [x] Works on the live URL

## Progress (2026-11-11)

- Backend (`admin-reviews.service.ts`): `GET /v1/admin/reviews` takes `sort=recent|relevant|top`, `per_page=10|25|50` and `page`, and answers `{ reviews, total, page, per_page }` (the "Show more" cursor is gone). The order comes from a fixed list in the code, never from the request as text: newest; Helpful marks + replies; stars; ties by newest, then id. Plain 400s: "Please choose Recently added, Most relevant or Top-rated.", "Please show 10, 25 or 50 reviews per page.", "Please choose a page from the list." (for 0, 1.5, x). Checked through the compiled code on real data (rolled back): each sort lists all 170 reviews over 7 pages of 25, none repeated, in order (relevant starts 12, 11, 10; top 5, 5, 5); Reported page 2 of 10 → 8 of 18; page 999 → empty.
- Frontend (`AdminReviews.tsx`): the shared Sort, Show 10/25/50 and pages from ticket 129; "Showing 11–20 of 170 reviews." (filtered: "… that match."). A new search, filter, sort or number per page goes back to page 1; the old page stays on screen until the new one arrives; moving to a page focuses the "Showing" line. Live updates refresh the page shown. If a delete leaves a page past the end: "Page N is empty now" with "Go to page M". The filter buttons and Hide it / Delete review fill their row on phones, like Places.
- Checked in the browser with the team's admin login (only reading): 1–10 of 170, Previous 1 2 … 17 Next; pages 2 and 17 (Next disabled on the last); Top-rated and Most relevant go back to page 1, Most relevant in order (12, 11, 10, 10, 8 …); Show 25 → 25 cards, 7 pages; Reported → 18, all reported. Phone widths in a pop-up at 425, 375 and 320 px: Sort, Show, filters, pages and Hide it / Delete each on one line, nothing wider than the screen (320: Sort 3 × 88, pages "Previous · Page 1 of 17 · Next", Hide/Delete 2 × 116).
- `npx tsc`, eslint, backend `tsc --noEmit`, `npm run build` and the frontend rule searches pass.

**Fix (2026-11-11, team report with screenshot):** "rectify the buttons of review in dimensions of 425px, 375px, and 320px … it has misalignment." Root cause: each review card had three rows of buttons sized to their own text — "N Helpful" alone, "Show replies (N)" alone, then Hide it / Delete review — so on phones they made a ragged stack of different widths. Now, below 640 px, two even rows of equal halves: [N Helpful] [Replies (N)] and [Hide it] [Delete]; what Helpful or Replies opens goes under the whole row, full width. "0 Helpful" and "0 replies" are quiet boxes the same size, so the rows stay even. On phones the small arrows are hidden and Delete review reads "Delete" (its screen reader name is still "Delete review: <reviewer>'s review of <place>"). From 640 px: one row of buttons as before. Measured in pop-ups at 425, 375 and 320 px on the first five cards: every row two equal buttons on one line, all four buttons the same width (116 × 44 at 320, 143 × 44 at 375), every label fits, nothing wider than the screen; with Helpful and Replies both open, the two lists sit under the row at the card's full width.

**Fix (2026-11-11, team report with screenshot):** the reply buttons under "Replies" — each reply's "N Helpful" and "Delete reply" sat at the two ends of a row sized to their text, and each level of answers was indented 24 px, so in deep answers the row ran out of room and Delete dropped under Helpful. Now, below 640 px, they are two equal halves ([N Helpful] [Delete]; screen readers hear "Delete reply: <name>'s reply"), the Helpful list opens under them, each level is indented 14 px and a reply's padding is 12 px. From 640 px: as before. Measured in pop-ups at 425, 375 and 320 px on the 11-reply thread (sorted Most relevant): every reply's two buttons on one line, equal, labels fit, nothing wider than the screen; the narrowest (deepest) pair 80 × 44 at 320, 108 × 44 at 375, 133 × 44 at 425.
- Team check (2026-11-11, localhost): "the team tested the newly modified feature it now resolve the issue in reviews reply in different dimensions. ticked all the boxes of ticket 130."
- **Not yet checked:** the live URL.
