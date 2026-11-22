# 163 — Show more reviews

**What to build:** A place's page no longer turns into an endless scroll:
only the first 3 reviews of the chosen sort show, then a **Show more
reviews** button adds 5 more each time, with "Showing 3 of 12" beside it,
until all are shown.

**Blocked by:** 162

**Status:** todo

- [x] 3 reviews show first; each press of Show more reviews adds 5
- [x] "Showing N of M" is always right, and the button disappears once all
      are shown; with 3 or fewer reviews there is no button
- [x] Changing the sort goes back to the first 3
- [x] A live update keeps the reviews already open
- [x] The traveler's own review and the Write a review form stay where they
      are
- [x] After pressing Show more, the keyboard focus lands on the first newly
      shown review, so a screen-reader user hears what was added
- [ ] Works on the live URL

**Progress (2026-11-22):** built with 162; the team confirmed it on localhost the
same day (every box but the live URL, which waits for the push).

- Checked in Chrome on Dinagyang Festival (10 reviews): 3 show first with
  "Showing 3 of 10"; one press (Enter on the keyboard) shows 8 and moves
  the focus to the 4th review; changing the chip goes back to 3; the
  button disappears once all are shown. With 3 or fewer reviews it never
  shows.
- The traveler's own review box and the Write a review form are above the
  chips and stay where they are.
- **Not checked:** a screen reader reading the newly focused review aloud,
  and the live URL.
