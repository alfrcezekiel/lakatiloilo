# 76 — Describe review_likes to TypeORM, and mark and unmark through it

**What to build:** The backend describes the review_likes table to TypeORM, like destinations, accommodations and reviews: review_id and user_id (together a like's identity) and created_at, linked to its review. TypeORM is told never to send user_id or created_at, because the database fills them in from the login and only lets travelers set review_id. Marking and unmarking a review as Helpful use this description instead of hand-written SQL, still as the logged-in traveler inside one transaction, so Row Level Security still decides. Travelers see no change.

**Blocked by:** None

**Status:** todo

- [x] review_likes is described to TypeORM next to the other tables, and TypeORM still never changes the database (synchronize stays off)
- [x] Marking and unmarking Helpful go through TypeORM, send only review_id, and answer the same { helpful_count, liked } as before
- [x] Marking twice, or unmarking twice, still changes nothing
- [x] Marking your own review is still refused, and the database refuses it too when checked through the backend's own login inside a transaction that is undone
- [x] No login, a fake login and a bad id still answer the same refusal messages
- [x] No new SQL, and nothing to run in Supabase
- [ ] Works on the live URL

**Progress (2026-11-02):** A new ReviewLike entity describes review_likes to TypeORM: review_id and user_id as the two-part identity, created_at, and the link to its review. user_id and created_at are marked insert: false and update: false, so TypeORM never names them when saving (024 only lets travelers send review_id). It is registered with the backend's database connection next to the other tables (synchronize stays off) and with the reviews module. Marking and unmarking now go through runner.manager (TypeORM on the same connection and transaction that asTraveler switched to the traveler): the review lookups use findOne and exists, the like is an insert of review_id with orIgnore ("on conflict do nothing"), unmarking deletes only where user_id = auth.uid(), and the new count uses count(). Only "select auth.uid()" stays a one-line query, because it is a function, not a table. The answers and messages are unchanged.

Checked:
- Against the real database, as a traveler through the backend's own login, inside a transaction that was rolled back (nothing kept), using the same TypeORM steps: the SQL sent for marking was INSERT INTO "review_likes"("review_id") VALUES (…) ON CONFLICT DO NOTHING (no user_id or created_at); marking someone else's review worked (count 1); marking it again changed nothing (still 1); marking my own review was refused by Row Level Security (42501); unmarking worked (count 0); unmarking again changed nothing.
- curl against the local backend: like with no login 401 "Please log in, then try again."; with a fake login 401 "Please log in again, then try again."; with a bad id 400; unlike with no login 401; reviews still load (200). Same as before.
- Backend type-check and lint pass. No new SQL; nothing to run in Supabase.

Not checked: marking and unmarking through the website with a real login (the team tests real logins), and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** with a real login, marking and unmarking Helpful works and the mark stays after a refresh. "Works on the live URL" stays open until ticket 76 is pushed and checked there.
