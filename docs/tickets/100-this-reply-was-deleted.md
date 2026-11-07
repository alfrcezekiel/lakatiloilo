# 100 — "This reply was deleted"

**What to build:** When a traveler deletes their own reply and it has answers under it, the reply stays in its place as a grey "This reply was deleted", with no name, tag, text or buttons, and its answers stay under it. A reply with no answers disappears completely, as today. The confirm step says "Delete this reply?" in both cases. When the last answer under a deleted reply is deleted, the deleted reply goes too. A deleted reply cannot be edited, liked or answered.

**Blocked by:** None

**Status:** todo

- [x] A numbered SQL file adds deleted_at to replies and the new delete rules; the team has run it in the Supabase SQL Editor
- [x] Deleting a reply with answers leaves "This reply was deleted" with its answers still under it, after a refresh too
- [x] Deleting a reply with no answers removes it completely; the confirm step says "Delete this reply?" both times
- [x] Deleting the last answer under a deleted reply removes the deleted reply too
- [x] A deleted reply shows no name, tag, text, Helpful count or buttons, and the database refuses editing, liking or answering it
- [ ] Works on the live URL

**Progress (2026-11-06):** built and waiting for the team to run supabase/sql/034-this-reply-was-deleted.sql. Deleting a reply now goes through one database function that only touches the traveler's own reply: with answers it becomes "This reply was deleted", without answers it is removed (and a deleted reply left with no answers goes too). Travelers can no longer delete replies directly, and editing, liking or answering a deleted reply is refused. The backend sends `deleted` with each reply and leaves out a deleted reply's writer; the page shows the grey line with the answers still under it, and the confirm step always says "Delete this reply?".

Checked: backend and website type-check and lint, website `npm run build`; DELETE /v1/replies/:id without a login answers 401. Until 034 is run, localhost answers 503 "Could not load reviews right now." for places with replies (the backend asks for the new column). Not checked: 034 run, the database rules (after 034, through the backend's login inside a rolled-back transaction), the page in a browser, and the live URL.

**Team check (2026-11-06):** the team ran 034 and it worked. Proved through the backend's login inside one transaction that was rolled back (nothing kept), on a real reply with one answer: a stranger's delete answers null and a direct delete is refused (42501); the writer's delete answers "kept", the reply's text, name and type are cleared and its answer stays; editing it changes 0 rows and deleting it again answers null; a like on it is refused by Row Level Security; an answer to it is refused ("That reply was deleted, so it can't be answered."); deleting the last answer removes the deleted reply too. Localhost GET /v1/reviews answers 200 and each reply carries `deleted` (a stray deletion-time field TypeORM added was removed). Not checked yet: the page in a browser, and the live URL.

**Team check (2026-11-06, localhost):** the team confirmed in the browser: a deleted reply with an answer shows "This reply was deleted" with the answer still under it, after a refresh too; a reply with no answers disappears and the confirm step says "Delete this reply?"; deleting the last answer under a deleted reply removes both; a deleted reply shows no name, date, text, Helpful count or buttons. Not checked yet: the live URL.
