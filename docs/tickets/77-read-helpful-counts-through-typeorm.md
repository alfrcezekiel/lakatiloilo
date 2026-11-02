# 77 — Read Helpful counts through TypeORM

**What to build:** Helpful counts and "liked by me" on a place's reviews, and Helpful counts on traveler profiles, are read through the review_likes TypeORM description from ticket 76 instead of hand-written SQL. The answers are exactly the same as before. Travelers see no change.

**Blocked by:** 76

**Status:** done (confirmed by the team on the live URL, 2026-11-02)

- [x] GET /v1/reviews answers the same helpful_count and liked_by_me as before, logged out and logged in
- [x] GET /v1/travelers/:id answers the same Helpful counts as before
- [x] No hand-written SQL for review_likes is left in the backend
- [x] The Helpful button and counts look and behave as before on detail pages and profiles
- [x] Works on the live URL

**Progress (2026-11-02):** Both reads that use likes are now built with TypeORM's query builder on the entities instead of hand-written SQL:
- GET /v1/reviews (reviews.service findForPlace): the review columns from the Review entity, plus helpful_count and liked_by_me as small sub-queries on ReviewLike, so it is still one database request. The place and the viewer travel as named parameters; with no viewer, liked_by_me is false.
- GET /v1/travelers/:id (travelers.service profile): the review joined to the Destination or Accommodation entity for its place name, plus helpful_count as the same sub-query on ReviewLike.
No hand-written SQL for review_likes is left in the backend (only comments mention the table).

Checked:
- Answers saved before the change and fetched after it from the local backend were byte-for-byte identical for Seda Atria's reviews, Agony Hill's reviews and Red's profile; GET reviews with a fake login still answers 200, and an unknown traveler still answers 404 "We couldn't find this traveler."
- Those places have no likes today, so against the real database, inside a transaction that was rolled back (nothing kept): after a traveler marked a review Helpful, the same query-builder reads answered helpful_count 1 with liked_by_me true for that traveler, false for someone else and false logged out, and the review writer's profile showed helpful_count 1 next to "Agony Hill". The SQL uses $1-style parameters for every value.
- Backend type-check and lint pass.

Not checked: the website with a real login, and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** with a real login, Helpful counts on reviews and profiles look right, the mark stays after a refresh, and logged out the counts still show. "Works on the live URL" stays open until ticket 77 is pushed and checked there.

**Confirmed by the team (2026-11-02):** checked on the live URL and marked done.
