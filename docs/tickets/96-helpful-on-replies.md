# 96 — Helpful on replies

**What to build:** Every reply gets a small glass **Helpful · 3** button with a thumbs-up, the same as on reviews. Logged in, it turns amber when marked and back when clicked again. Logged out, only the count shows. On the traveler's own reply, only the count: nobody can mark their own reply.

A new reply_likes table: reply_id (removed with the reply), user_id, created_at, one like per traveler per reply. Row Level Security: anyone may read; only a logged-in traveler may add a like, with their own user_id, never on their own reply; only they may remove it. It joins the Realtime list, so other open pages update.

**Blocked by:** 95

**Status:** todo

- [x] A numbered SQL file creates reply_likes with Row Level Security on, the policies above, and adds it to the Realtime list. The team has run it in the Supabase SQL Editor
- [x] POST and DELETE /v1/replies/:id/like mark and unmark and answer { helpful_count, liked }; 400 "You can't mark your own reply as helpful.", 404 no such reply, 401 without a login
- [x] GET /v1/reviews gives each reply helpful_count, and liked_by_me with a login
- [x] A logged-in traveler can mark and unmark another traveler's reply; it stays marked after a refresh
- [x] A like on your own reply is refused by the database, not just hidden in the page
- [x] With "reduce motion" on, the button only changes colour
- [ ] Works on the live URL

**Progress (2026-11-05):** supabase/sql/032-reply-likes.sql creates reply_likes (reply_id, user_id, created_at; one like per traveler per reply; removed with the reply), lets travelers send only reply_id, turns Row Level Security on with four policies (anyone can read; like only as yourself and never your own reply; remove only your own; the backend may read) and adds it to the Realtime list. The team ran it in the Supabase SQL Editor ("it worked").

Backend: a ReplyLike entity (like ReviewLike). GET /v1/reviews gives every reply helpful_count, and liked_by_me with a valid login, through two small sub-queries in the same request. POST and DELETE /v1/replies/:id/like run as the logged-in traveler and answer { helpful_count, liked }.

Website: every reply has a small Helpful button, the same HelpfulButton as on reviews (now also for replies, in a smaller size). Logged out, or on your own reply, only the count shows. The count updates at once after a click, and other open pages update through Realtime (reply_likes was added to what the reviews listen to). Editing a reply keeps its count.

Checked:
- Database, through the backend's own login inside a transaction that was rolled back (nothing kept): the writer liking their own reply was refused by Row Level Security (42501); another traveler liking it added 1 row; liking again was refused (23505, one like per traveler); liking as the writer and editing a like were refused (42501, no permission); the writer removing the other traveler's like removed 0 rows; the other traveler removing their own removed 1; after the rollback the reply had 0 likes.
- curl against the local backend: GET /v1/reviews replies carry helpful_count (a number) and liked_by_me (true/false) and nothing extra; like and unlike with no login 401, fake login 401, a bad id 404 "We couldn't find that reply."
- Website and backend type-checks, lint and `npm run build` pass.

Not checked: marking and unmarking with a real login, "stays marked after a refresh", another browser updating live, "reduce motion", the look at 375 px, and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-05):** with a real login, marking another traveler's reply Helpful raised its count and unmarking removed the like (also gone from reply_likes in the Supabase dashboard); logged out, a reply with no likes shows "No one has marked this helpful yet"; logged in, a reply that cannot be marked shows "1 traveler found this helpful" as text; tidy at 375 px. Still to confirm: still marked after a refresh, "reduce motion", and the live URL.

**Checked by the team on localhost (2026-11-05):** after a refresh, a reply they marked Helpful is still marked with the same count. Still to confirm: "reduce motion", and the live URL.

**Checked by the team on localhost (2026-11-05):** with Chrome's "Emulate CSS media feature prefers-reduced-motion: reduce" (the console answered true), a reply's Helpful button changes colour without lifting. With only Ubuntu's own setting, the browser answered false (it does not pass that setting on to pages), so the button still lifted there; that is the browser, not the app. Only "Works on the live URL" is left.
