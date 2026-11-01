# 59 — Reviews through TanStack Query

**What to build:** A place's reviews are fetched and remembered with TanStack Query. Going back to a place seen in the last minute shows its reviews straight away while fresh ones load quietly. Writing, editing and deleting a review update the Rating tile and the review list at once. Reviews still go through the NestJS backend; places and the login are not changed.

**Blocked by:** 57

**Status:** in progress

- [x] Opening a place, going to the home page, and opening the same place again shows its reviews with no loading placeholder
- [x] Writing a review shows it at the top of the list, and the Rating tile's average and count update at once
- [x] Editing and deleting a review update the list and the Rating tile at once
- [x] If the backend cannot be reached, "We couldn't load reviews right now." still shows
- [x] Logged-out visitors still see reviews and the "Log in to write a review" link
- [ ] Works on the live URL

**Progress (2026-11-01):** Installed TanStack Query (version 5). One shared cache wraps the whole site; it keeps a place's reviews for about a minute after leaving the page and tries a failed load once more before giving up. Reviews now come from that cache, and writing, editing or deleting a review puts the backend's answer straight into it, so the Rating tile and the list change together. Places and the login are unchanged. Checked on localhost: opening a hotel from the home page showed the loading placeholder the first time; going back and opening it again showed "★ 4.7 · 3 reviews" at once with no placeholder, then refreshed quietly (one extra request). With reviews requests sent to an address that does not answer (a pretend failure in that browser tab only), "We couldn't load reviews right now." appeared after about 1.7 seconds and the Rating tile said "Not available". Logged out, the "Log in to write a review" link still shows. Type-check, lint and `npm run build` pass. Not checked: writing, editing and deleting a review (needs a real login, so the team tests it), and the live URL.

**Checked by the team on localhost (2026-11-01):** writing, editing and deleting a review, and the other boxes except the live URL.
