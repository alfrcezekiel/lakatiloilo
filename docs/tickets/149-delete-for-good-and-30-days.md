# 149 — Delete for good and 30 days

**What to build:** In Trash, **Delete for good** removes an item after a pop-up, with its photo files. Items older than 30 days are deleted for good when an admin opens Trash. Each item says how many days are left.

**Blocked by:** 147

**Status:** in progress

- [x] Delete for good asks in a pop-up first, then removes the item and its photo files
- [x] Each item shows how many days it has left
- [x] An item past 30 days is gone after opening Trash (proved with a rolled-back test)
- [x] Works with the keyboard alone, at 320, 375 and 425 px
- [ ] Works on the live URL

## Progress (2026-11-14)

- Database: supabase/sql/062-delete-for-good.sql, **for the team to run**: admin_delete_review_for_good, admin_delete_reply_for_good, admin_delete_place_for_good (only for items in the Trash) and admin_empty_expired_trash (more than 30 days: places first, then reviews, then replies), admins only. Each answers the photo files to delete. A reply with answers stays for good as "This reply was deleted" (the rule from 052); one without is removed.
- Backend: DELETE /v1/admin/trash/reviews/:id, /trash/replies/:id, /trash/places/:type/:id ("Deleted for good.", 404 when not in the Trash), then the files are deleted from Storage as the admin. GET /v1/admin/trash first empties what is past 30 days and deletes its files.
- Dashboard: each Trash card has Restore and **Delete for good** (two equal columns on phones); Delete for good opens a pop-up saying what goes with it and "This cannot be undone." Days left was already shown (ticket 147).
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` and the style searches pass.
- 062 run by the team ("it worked"). Proof (rolled back, nothing kept):
  - Review (4 photos, 1 reply): not in the Trash → no change; a traveler → refused; admin → deleted with its reply and photo rows, its 4 photo files answered for Storage; again → no change.
  - Replies: a traveler → refused; the one with 3 answers → stays as "This reply was deleted" with its 3 answers, its like and kept text gone, out of the Trash list; the one without → removed.
  - Place (11 reviews, 1 photo): not in the Trash → no change; a traveler → refused; admin → deleted with its 11 reviews, photos and credits; 1 place photo file and 9 review photo files answered for Storage.
  - 30 days: a traveler emptying → refused; a fresh item in the Trash is not deleted. Nobody can backdate an item (no update right on trashed_at, which is right), so the 31-day case is a check for the team to run in the SQL Editor as the table owner, which undoes itself.
- 31 days, checked by the team in the SQL Editor (2026-11-14, undone by its own final error): a review, a reply and a destination backdated 31 days → "places 1, reviews 1, replies 1 deleted for good; 2 review photo files and 1 place photo files to delete; still there: 0".
- **Checked by the team on localhost (2026-11-14):** /admin/trash with Delete for good ("it works on our end").
- Not yet checked: the live URL (round 30 is not committed yet).
