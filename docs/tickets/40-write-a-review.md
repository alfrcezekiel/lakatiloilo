# 40 — Write a review

**What to build:** A logged-in traveler sees a form in the Reviews section to pick 1 to 5 stars and write up to 500 characters. When they submit, their review appears in the list straight away and the average and count update. Each traveler can leave only one review per place.

**Blocked by:** 39

**Status:** in progress (tested locally by the team; live URL still to check)

- [x] Logged in: the form shows instead of the "Log in to write a review" link
- [x] Stars can be picked with a mouse, a finger and the keyboard
- [x] The form refuses an empty rating and text over 500 characters, with a clear message
- [x] A submitted review appears straight away with the traveler's display name, and the average and count update
- [x] Works for a destination and for an accommodation
- [x] A second review for the same place is refused (by the database, not only the page) with a clear message
- [ ] Works on the live URL

**Check notes (2026-10-21):** the form was "missing" on places the traveler had already reviewed: by design there is one review per place, but the old one-line note was easy to miss. That state is now a clear "You've already reviewed this place." box, and the traveler's own review is marked "You". Confirmed by the team: the form shows on Dinagyang Festival, and the box shows on places already reviewed.
