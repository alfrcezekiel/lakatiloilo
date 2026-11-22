# 162 — Sort a place's reviews

**What to build:** On a destination or accommodation page, three chips over
the reviews let a traveler choose the order: **Most relevant** (chosen when
the page opens), **With photos & videos** and **Newest**. Under the average
stars, a bar for each star level shows how many reviews gave it, as in the
"Lakat Iloilo — Destination & Accommodation Detail Pages" design.

**Blocked by:** None

**Status:** done (the team confirmed it works on the live site, 2026-11-22)

- [x] The chips read, in order: Most relevant · With photos & videos · Newest;
      the chosen one is white, the others glass
- [x] Most relevant: most Helpful marks plus replies first, newest first on
      a tie (the same rule as the admin Reviews screen)
- [x] With photos & videos: only reviews with at least one photo (videos
      join in ticket 165), newest first; "No reviews with photos or videos
      yet." when there are none
- [x] Newest: every traveler's review, newest first
- [x] One bar per star level (5 to 1) with its count under the average
- [x] The chips are real buttons that say which one is chosen to a screen
      reader, reachable with Tab, at least 44 px tall, and fit on one line
      or wrap evenly at 320 px
- [x] A live update (a new review, a Helpful mark) keeps the chosen sort
- [x] Works on the live URL

**Progress (2026-11-22):** built; the team confirmed it on localhost the same day
(every box but the live URL, which waits for the push).

- The order rules live in their own small file with 7 unit tests (Most
  relevant counts Helpful marks plus replies, leaving out replies in the
  Trash, ties to the newest; With photos & videos; Newest; the list passed
  in is never changed).
- The star bars under the average already existed (glass detail pages
  round), so nothing new was needed for that box.
- Checked in Chrome on Dinagyang Festival (10 reviews, 5 with photos): each
  chip's order on screen matches the same rule worked out from the API's
  answer; the chosen chip says "pressed" to a screen reader. Chips are one
  row of 44 px pills from 768 px up, and three equal columns on phones
  (the long label wraps inside its pill, 71 px tall); nothing scrolls
  sideways at 320, 375, 425, 768, 1024 and 1440 px.
- A notification that points at a review further down opens the list far
  enough to show it; if "With photos & videos" would hide it, Newest is
  used instead.
- **Not checked:** a live update arriving while a chip is chosen (the sort
  is kept in the page's state, which a live update doesn't touch), and the
  live URL.

**Live check (2026-11-22):** the team confirmed this ticket on the live
site the same day it was pushed (commit d2db292), so the "Not checked: the
live URL" lines above are answered.
