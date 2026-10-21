# 41 — Edit and delete your own review

**What to build:** A traveler who already reviewed a place sees their own review with Edit and Delete instead of the form. Edit lets them change the stars and text; Delete removes the review after a confirmation. Nobody can change or delete someone else's review: the database refuses it, not just the page.

**Blocked by:** 40

**Status:** todo

- [ ] The traveler's own review shows Edit and Delete; other reviews do not
- [ ] Editing changes the stars and text, and the average updates
- [ ] Deleting asks "Are you sure?", removes the review, and the form comes back
- [ ] Logged in as a second test account, trying to change or delete the first account's review is refused by Row Level Security (tested directly, not only by hiding buttons)
- [ ] Works on the live URL
