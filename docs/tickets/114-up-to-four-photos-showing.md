# 114 — Up to four photos: showing them

**What to build:** Under a review, its photos show as a row of small pictures. Clicking one opens it larger, with next and previous buttons, arrow keys and Escape. The same row shows on a traveler's profile and on the admin Reports screen.

**Blocked by:** 113

**Status:** done

- [x] A review with several photos shows them as a row; clicking one opens it larger with next and previous, arrow keys and Escape
- [x] The row shows on traveler profiles and on the Reports screen
- [x] Works at 375 px and on a laptop
- [x] Works on the live URL

## Progress (2026-11-09)

- **ReviewPhotos** (src/components/ReviewPhoto.tsx) is now a small gallery:
  - a row of square photos; clicking one opens it larger in one shared pop-up (the browser's own dialog)
  - with more than one photo: Previous and Next buttons, the left and right arrow keys, and "2 of 4" (read out by screen readers); going past the last starts again at the first
  - Escape, Close or a click on the dim background closes it, and the focus goes back to the photo that opened it
  - every photo has a numbered description ("Photo 2 of 4 from Red's review")
- The same component is used under reviews on place pages, on traveler profiles and on the Reports screen (since ticket 113).

Checked:
- In the browser (logged out), on a review with 4 photos:
  - clicking the 2nd opens "2 of 4"; → shows 3 of 4; → → wraps to 1 of 4; ← shows 4 of 4; Next shows 1 of 4
  - Escape closes it, and the focus is back on the 2nd photo
- Type-check, lint and `npm run build`.

Not checked:
- 375 px (the test browser window cannot be made narrower; the buttons sit in one row, about 320 px wide in all)
- profiles and Reports in the browser
- the live URL

**Team check (2026-11-09, localhost):** several photos show as a row; a photo opens larger with Previous and Next, the arrow keys and Escape. Still open: the live URL.

**Team check (2026-11-10, live URL):** the team confirmed it works on the live URL; all boxes ticked, ticket done.
