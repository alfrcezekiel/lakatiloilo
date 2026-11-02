# 85 — Answer a reply

**What to build:** A logged-in traveler can answer a reply, not only a review. Every reply gets a small **Reply** link that opens the same small form (up to 300 characters) right under that reply. The answer shows indented under the reply it answers, oldest first, joined by the thin left line, and the list updates at once. The Reply button under the review still adds a reply to the review itself. Logged out, threads show but there is no Reply link.

The review_replies table gains parent_reply_id: the reply being answered, or empty when the reply answers the review. The database refuses a parent reply that is under a different review, and deleting a reply deletes every answer under it.

**Change (2026-11-02, team request):** answers to a reply now show newest first, so a new answer appears right under the reply it answers (where its form was) instead of below older answers and their threads, and "Your reply is posted." shows under the new reply. Replies to the review itself stay oldest first. Made during ticket 88.

**Blocked by:** 84

**Status:** todo

- [x] A numbered SQL file adds parent_reply_id to review_replies, lets travelers send it, refuses a parent reply from another review, and removes answers with the reply they answer. Row Level Security stays on with the same policies. The team has run it in the Supabase SQL Editor
- [x] POST /v1/reviews/:id/replies accepts an optional parent_reply_id; a missing parent reply, or one under another review, answers 400 "That reply isn't under this review."
- [x] GET /v1/reviews gives each reply its parent_reply_id
- [x] A logged-in traveler can answer a reply; the answer shows indented under it at once, and still after a refresh
- [x] Replies to the review itself still work as before
- [x] Logged out, the threads show but there is no Reply link
- [x] Looks tidy on a phone (375 px) and a laptop
- [x] Works on the live URL

**Progress (2026-11-02):** supabase/sql/028-replies-to-replies.sql adds parent_reply_id to review_replies (empty = answers the review; deleting a reply deletes every answer under it), a check that refuses a parent reply that is missing or under another review (code 22023), and lets travelers send parent_reply_id. Row Level Security and the four policies from 025 are unchanged. The team ran it in the Supabase SQL Editor ("it worked").

Backend: the ReviewReply entity has parent_reply_id. POST /v1/reviews/:id/replies takes an optional parent_reply_id: anything that is not an id, or the database's 22023, answers 400 "That reply isn't under this review." GET /v1/reviews gives each reply its parent_reply_id.

Website: the replies component builds the threads: replies to the review first, each reply's answers indented under it (oldest first), joined by the thin left line. Logged in, every reply has a small Reply link (named "Reply to <name>" for screen readers) that opens the same small form under that reply; only one form is open at a time, and a refusal shows inside that form. The Reply button under the review still answers the review. The indent keeps growing for now; ticket 86 stops it after 3 levels.

Checked:
- Database, through the backend's own login as two real travelers inside a transaction that was rolled back (nothing kept): answering a reply and answering an answer worked; an answer pointing at a reply under another review, or at a reply that does not exist, was refused (22023); changing an answer's parent was refused (42501); a stranger deleting a reply deleted 0 rows; the writer deleting it deleted 1, and the 2 answers under it were gone too.
- curl against the local backend: no login 401; fake login with a parent that is not an id, or a number, 400 "That reply isn't under this review."; fake login with a good-looking id 401. GET reviews shows parent_reply_id (null on every existing reply).
- Browser, with a pretend login and pretend backend answers (nothing sent to Supabase): a 3-level thread showed indented; answering the third-level reply sent its id as parent_reply_id and the answer showed at once as level 4; the review's own Reply button sent no parent; empty text showed "Please write 1 to 300 characters." inside the open form; logged out, threads showed with no Reply buttons; at 375 px, four levels deep, nothing reached past the screen edge.
- Website and backend type-checks, lint and `npm run build` pass.

Not checked: a real login (the team tests real logins), "still there after a refresh" with real data, and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** with a real login, answering a reply and answering an answer work, the threads stay in place after a refresh, and logged out there are no Reply buttons. "Works on the live URL" stays open until ticket 85 is pushed and checked there.

**Checked by the team on the live URL (2026-11-02):** the threaded replies round checklist passed after the push (1c3170c).
