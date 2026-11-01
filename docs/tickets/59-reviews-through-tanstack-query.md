# 59 — Reviews through TanStack Query

**What to build:** A place's reviews are fetched and remembered with TanStack Query. Going back to a place seen in the last minute shows its reviews straight away while fresh ones load quietly. Writing, editing and deleting a review update the Rating tile and the review list at once. Reviews still go through the NestJS backend; places and the login are not changed.

**Blocked by:** 57

**Status:** todo

- [ ] Opening a place, going to the home page, and opening the same place again shows its reviews with no loading placeholder
- [ ] Writing a review shows it at the top of the list, and the Rating tile's average and count update at once
- [ ] Editing and deleting a review update the list and the Rating tile at once
- [ ] If the backend cannot be reached, "We couldn't load reviews right now." still shows
- [ ] Logged-out visitors still see reviews and the "Log in to write a review" link
- [ ] Works on the live URL
