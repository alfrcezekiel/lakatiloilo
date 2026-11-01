# 72 — "Helpful" likes on reviews

**What to build:** Every review shows how many travelers found it helpful. A logged-in traveler can mark another traveler's review as Helpful and unmark it, with a small glass "Helpful · 3" button and thumbs-up icon that turns amber when marked. Logged out, or on the traveler's own review, only the count shows ("3 found this helpful"). Likes are kept in a new review_likes table with Row Level Security, written through the backend as the logged-in traveler.

**Blocked by:** None

**Status:** todo

- [x] A numbered SQL file creates review_likes with Row Level Security on and policies: anyone may read; a logged-in traveler may add a like only as themselves and never on their own review; only they may remove it; no one may edit it. The team has run it in the Supabase SQL Editor
- [x] POST and DELETE /v1/reviews/:id/like work for a logged-in traveler and answer the new count; refusals give plain messages (not logged in, no such review, own review)
- [x] GET /v1/reviews gives each review its Helpful count, and whether this traveler liked it when they are logged in
- [x] Logged in, the button marks and unmarks; the count updates at once and is still right after a refresh
- [x] Logged out, and on the traveler's own review, only the count shows
- [x] Marking your own review is refused by the database even when the backend is asked directly (Row Level Security), not just hidden in the page
- [x] With "reduce motion" turned on, the button only changes colour
- [ ] Works on the live URL

**Progress (2026-11-01):** supabase/sql/024-review-likes.sql creates review_likes (one like per traveler per review, removed with the review) with Row Level Security on: anyone may read; a logged-in traveler may add a like only as themselves and never on their own review; only they may remove it; there is no edit policy. The backend may read likes. The team ran it in the Supabase SQL Editor ("it worked").

Backend: POST and DELETE /v1/reviews/:id/like run as the logged-in traveler (asTraveler), so the policies decide, and answer { helpful_count, liked }. A like on your own review is refused with "You can't mark your own review as helpful." before the database even sees it; marking or unmarking twice changes nothing. GET /v1/reviews now gives each review helpful_count, and liked_by_me when the request carries a valid login; a missing or expired login just counts as logged out, so reading reviews never fails because of it.

Website: under each review, a "Helpful · 3" button with a thumbs-up (glass, amber with a filled thumb when marked, 44 px tall, aria-pressed for screen readers) for logged-in travelers on other travelers' reviews. Logged out, or on your own review, only the text "3 travelers found this helpful" (nothing when the count is 0). The page keeps one copy of a place's reviews per traveler, so one traveler's marks never show for another after logging in or out. A Helpful click updates the count at once and does not reload the page.

Checked:
- curl against the local backend: GET reviews answers helpful_count and liked_by_me (0 and false for now); GET with a fake login still answers 200; like with no login 401 "Please log in, then try again."; with a fake login 401 "Please log in again, then try again."; with a bad id 400; unlike with no login 401.
- Row Level Security, through the backend's own database login inside a transaction that was rolled back (nothing kept): liking your own review was refused by the policy (42501); liking someone else's review worked; liking "as" someone else by typing their user_id was refused; editing a like was refused; someone else deleting your like deleted 0 rows.
- Browser, logged out: no Helpful buttons; with pretend backend answers, a review with 1 like showed "1 traveler found this helpful" and a review with 0 showed nothing.
- Backend type-check, website type-check, lint and `npm run build` pass.

Not checked: the logged-in button in the browser. A pretend login (no real account) could not be kept long enough in the preview to test it; this also happened in ticket 69, before this ticket's code. The team tests real logins: mark and unmark another traveler's review, refresh, and check your own review shows no button. Also not checked: a real phone, and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-01):** with a real login, marking and unmarking another traveler's review works, the mark stays after a refresh, and the traveler's own review shows no button. "Works on the live URL" stays open until ticket 72 is pushed and checked there.
