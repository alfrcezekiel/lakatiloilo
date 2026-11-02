# 79 — Replies on reviews

**What to build:** Under each review, its replies show, oldest first: the replier's name (linking to their profile), their traveler type tag, the text and the date. A logged-in traveler gets a **Reply** button that opens a small form (up to 300 characters), and can delete their own replies. There are no replies to replies and no editing. Replies are kept in a new review_replies table with Row Level Security, described to TypeORM as a ReviewReply entity, and written through the backend as the logged-in traveler.

**Blocked by:** None

**Status:** todo

- [x] A numbered SQL file creates review_replies with Row Level Security on and policies: anyone may read; a logged-in traveler may add a reply only as themselves; only the writer may delete it; no one may edit it. The database copies the replier's name and traveler type from the account. The team has run it in the Supabase SQL Editor
- [x] POST /v1/reviews/:id/replies and DELETE /v1/replies/:id work through TypeORM as the logged-in traveler, with plain refusal messages (not logged in, no such review, text outside 1–300 characters, someone else's reply)
- [x] GET /v1/reviews gives each review its replies, oldest first
- [x] Replies show under each review to everyone, logged in or not; the replier's name opens their profile
- [x] A logged-in traveler can reply, and delete their own reply; the list updates at once
- [x] Deleting someone else's reply is refused by the database (Row Level Security), not just hidden in the page
- [x] Looks tidy on a phone (375 px) and a laptop
- [ ] Works on the live URL

**Progress (2026-11-02):** supabase/sql/025-review-replies.sql creates review_replies (removed with their review, 1–300 characters) with Row Level Security on: anyone may read; a logged-in traveler may add a reply only as themselves; only the writer may delete it; there is no edit policy. A trigger copies the replier's name and traveler type from the account, with the same rules as reviews. The backend may read replies. The team ran it in the Supabase SQL Editor ("it worked").

Backend: a ReviewReply entity (id, user_id, name, type and date are never sent; only review_id and the text). A new replies service and controller: POST /v1/reviews/:id/replies (201 with the saved reply) and DELETE /v1/replies/:id (200 "Your reply has been deleted."; 404 for someone else's), both as the logged-in traveler. GET /v1/reviews now gives each review its replies, oldest first (one extra request per page of reviews). The "act as the traveler" step moved out of the reviews service into a small shared TravelerTransactions helper, used by reviews, likes and replies, so replies did not grow the reviews service (now 318 lines); its behaviour is unchanged.

Website: under each review, its replies (name linking to the profile, traveler tag, date, text) for everyone. Logged in: a glass Reply button opens a small form with a 0 / 300 counter, Post reply (amber, spinner and "Posting…") and Cancel; your own replies get Delete with a "Yes, delete" step. The list updates at once with "Your reply is posted." / "Your reply has been deleted.".

Checked:
- Row Level Security and the TypeORM SQL, against the real database as travelers inside a rolled-back transaction (nothing kept): the SQL sent for a reply names only review_id and comment; the reply came back with the name filled in by the trigger, the right user, an id and a date; empty text and 301 characters were refused by the database (23514); editing a reply was refused (42501); another traveler deleting it deleted 0 rows but could read it; the writer deleting it deleted 1. Replying "as" someone else by sending user_id straight to the database was refused (42501); through TypeORM the typed-in user_id is dropped.
- curl against the local backend: reply with no login 401, fake login 401, empty text 400 "Please write 1 to 300 characters.", bad id 400; delete with no login 401, fake login 401. GET reviews includes replies.
- Browser with pretend backend answers and a pretend login (one preview tab; nothing sent to Supabase): logged out, a reply showed with its name link, tag and date and no Reply button; logged in, empty text showed the message, posting showed "Posting…" (disabled), the reply appeared and the form closed, Delete → "Yes, delete" removed it with "Your reply has been deleted."; at 375 px nothing reaches past the screen edge.
- Backend type-check, website type-check, lint and `npm run build` pass.

Not checked: a real login (the team tests real logins), writing and deleting reviews through the moved "act as the traveler" helper with a real login, and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** with a real login, replying and deleting a reply work, replies show when logged out, and writing, editing and deleting a review still work through the moved "act as the traveler" helper. "Works on the live URL" stays open until ticket 79 is pushed and checked there.
