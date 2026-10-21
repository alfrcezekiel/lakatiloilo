# 41 — Edit and delete your own review

**What to build:** A traveler who already reviewed a place sees their own review with Edit and Delete instead of the form. Edit lets them change the stars and text; Delete removes the review after a confirmation. Nobody can change or delete someone else's review: the database refuses it, not just the page.

**Blocked by:** 40

**Status:** done

- [x] The traveler's own review shows Edit and Delete; other reviews do not
- [x] Editing changes the stars and text, and the average updates
- [x] Deleting asks "Are you sure?", removes the review, and the form comes back
- [x] Logged in as a second test account, trying to change or delete the first account's review is refused by Row Level Security (tested directly, not only by hiding buttons)
- [x] Works on the live URL

**Security test (2026-10-21):** run by the team in the Supabase SQL Editor, acting as the second test account against the first account's reviews, inside a transaction that was rolled back. Result: reviews_changed 0, reviews_deleted 0, first_account_reviews_still_there 6. Row Level Security refuses another account's edits and deletes even when they go straight to the database. (The test only counts if the second email matches a real account; `select count(*) from auth.users where email = '…'` should return 1.)
