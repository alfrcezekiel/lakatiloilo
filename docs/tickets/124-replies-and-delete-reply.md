# 124 — Replies and Delete reply

**What to build:** "Show replies" under a review on the Reviews screen opens its replies, each with Delete reply (after "Yes, delete"). A reply that has answers stays as "This reply was deleted"; one with none is removed.

**Blocked by:** 122

**Status:** in progress

- [x] A numbered SQL file lets admins delete any reply through a database function that follows the same rule as the writer's own delete; the team has run it
- [x] An admin opens a review's replies and deletes one with answers (it stays as "This reply was deleted") and one without (it is removed); the place page shows the same
- [x] A traveler cannot delete someone else's reply (refused by the database)
- [ ] Works on the live URL

## Progress (2026-11-10)

- `supabase/sql/052-admins-delete-replies.sql`: `admin_delete_reply(target)`, the same rule as `delete_own_reply` (037) for any reply, refusing anyone who is not an admin. The team ran it ("it worked").
- Proved in a rolled-back transaction through the backend's login, on a test thread written by two travelers (nothing kept): traveler B could not delete A's reply through the admin function (42501), the own-reply function (null) or directly (42501); the admin deleted A's reply that had an answer → "kept" (text, name and writer emptied, its like removed, the answer stayed); a lone reply → "removed"; then the answer → "removed", and the emptied reply above it went too; an already-gone reply → null.
- Backend: `GET /v1/admin/reviews/:id/replies` (oldest first, deleted ones included; 404 unknown review) and `DELETE /v1/admin/replies/:id` → `{ id, outcome: "kept" | "removed", message }` (404 when gone). Checked on real data: the review with the most replies (11) lists all 11, oldest first. curl: 401 without a login and with a fake one.
- Frontend: a review with replies shows **Show replies (N)** (aria-expanded); the thread nests answers under the reply they answer, "This reply was deleted" in grey, each reply with its name, date, "· edited", text, Helpful count and **Delete reply**. The pop-up says what will happen: with answers "…will stay in its place as \"This reply was deleted\" and the answers stay", without "…will be removed". After deleting, the thread and the review's reply count update and a line says what happened.
- Checked in the browser with the team's admin login (only opening and cancelling, nothing changed), at 425 px: Show replies (8) opened 8 replies nested 5 deep with 6 Delete reply buttons; the pop-up for a reply with answers gave the "will stay" text with Cancel focused; Escape closed it and the focus returned to that Delete reply; nothing wider than the screen.
- `npx tsc`, eslint, backend `tsc --noEmit` and `npm run build` pass.
- Team check (2026-11-10, localhost): "ticked all boxes of ticket 124."
- **Not yet checked:** the live URL.
