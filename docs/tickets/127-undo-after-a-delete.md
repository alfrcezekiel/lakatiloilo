# 127 — Undo after a delete

**What to build:** After "Yes, delete" on a review, a reply or a place, and after Remove on a like, the item leaves the list at once and a line offers Undo for 8 seconds. Undo puts it back and nothing was deleted; when the time runs out, or the admin leaves the page, the delete is really made.

**Blocked by:** 121, 123, 124, 125

**Status:** in progress

- [x] Undo within 8 seconds puts a review, a reply, a place and a like back, and nothing changed for travelers
- [x] Without Undo each is really deleted after 8 seconds, and also when the admin leaves the page
- [x] The Undo line can be reached and used with the keyboard and is read out by screen readers
- [ ] Works on the live URL

## Progress (2026-11-11)

- No database or backend change: Undo happens before anything is sent. The waiting delete is one DELETE to the existing endpoints (`adminDeletePaths` in `api.ts`).
- `PendingDeletes.tsx` (new): "Yes, delete" (review on Reviews and on Reports, reply, place) and Remove (Helpful mark) start 8 seconds. The item leaves every dashboard list at once (the lists hide what is waiting; a reply with answers shows "This reply was deleted", as it will be); a line at the bottom says e.g. "Lia's review of Mt. Napulak deleted. Deleting in 8 s." with **Undo**, which gets the keyboard focus and is read out (aria-live). Undo: back, nothing sent. Then: the time runs out, or the admin opens another dashboard page or logs out (sent first, while the login works), or the tab closes or reloads (sent with keepalive, so the browser finishes it). Each is sent once ("Deleting…" replaces Undo while it is on its way). A refused send brings the item back with the backend's sentence. Travelers see the item until the delete is really sent.
- The pop-ups now say "You can Undo for 8 seconds." instead of "This cannot be undone." The places list's old "was deleted" line, the replies panel's "Deleted" line and the unused delete helpers are gone (the Undo line replaces them).
- Checked in the browser with the team's admin login, with the page's network call for deletes swapped for a pretend answer, so nothing was deleted: review Delete → card gone, "Deleting in 8 s… 6 s", focus on Undo; Undo → card back, focus back on the page, nothing sent; without Undo → one DELETE to /v1/admin/reviews/<id> after 8 s; leaving for Places → one DELETE (a double send was found and fixed); the page-closing signal → one DELETE with keepalive; reply with answers → stays as "This reply was deleted", Undo → back; reply without answers 8 → 7 → 8; a reply's Helpful 2 → 1 → 2; place 37 → 36 → 37 places, nothing sent.
- `npx tsc`, eslint and `npm run build` pass.
- Team check (2026-11-11, localhost): deleting a review's reply and removing Helpful marks showed the 8 seconds; after the 8 seconds the reply and the marks were deleted completely.
- Team check (2026-11-11, localhost): "ticked all the boxes in ticket 127."
- **Not yet checked:** the live URL.
