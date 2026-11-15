# 147 — Deleted reviews go to Trash

**What to build:** A new **Trash** page on the dashboard (/admin/trash, in the sidebar). A review deleted by an admin (after its 8-second Undo) goes there, with when and by which admin. **Restore** brings it back as it was, with its replies, Helpful likes, photos and reports.

**Blocked by:** None

**Status:** in progress

- [x] The trash table exists with Row Level Security: admins only (proved with a rolled-back test)
- [x] Deleting a review on Reviews or Reports puts it in Trash; it is gone from the site
- [x] Restore brings it back with its replies, likes, photos and reports; it shows on the place page again
- [x] Its photo files stay in Storage while it is in Trash
- [x] A logged-out visitor gets 401 and a traveler 403; /admin/trash is "not found" for them
- [x] Works with the keyboard alone, at 320, 375 and 425 px
- [ ] Works on the live URL

## Progress (2026-11-13)

- **Design change (for the team to confirm):** no separate trash table with copies (the spec's first plan). Re-inserting copied rows would run the database's own "new row" rules again: a restored reply would become the admin's, and notifications would be sent again. Instead a deleted review is marked (trashed_at, trashed_by) and nothing is copied or removed; every read rule leaves trashed reviews out for everyone, admins too, so every page and screen leaves them out with no other change; only the Trash, through admin-only functions, sees them. SPEC.md Data and API updated.
- Database: supabase/sql/060-trash-for-reviews.sql, run by the team ("it worked"): trashed_at and trashed_by; the four read rules get "and not in the Trash"; one review per traveler per place among reviews not in the Trash (so a traveler can write a new one meanwhile; restoring the old one is then refused); admin_trash_review, admin_restore_review and admin_trashed_reviews (admins only), each telling open place pages through review_visibility_signals.
- Backend: Delete review (the Reviews and Reports screens, the same endpoint) now moves the review to the Trash ("Moved to the Trash. You can restore it there for 30 days.") and no longer deletes its photo files; GET /v1/admin/trash lists it with expires_at (30 days); POST /v1/admin/trash/reviews/:id/restore restores it (404 not in the Trash, 409 when its writer wrote a new review of the place).
- Dashboard: "Trash" in the sidebar; /admin/trash: a short line on what the Trash is, then each review with its writer, place (a link), stars, the start of its text, its replies / photos / reports, "Deleted <date> by <admin>. N days left." (amber at 3 days or fewer), and Restore (full width on phones); an empty state. The delete pop-ups now say the review goes to the Trash for 30 days. After a delete or restore, the lists and counts are asked again.
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` and the rule searches pass.
- Proof (rolled back, nothing kept), on a review with 12 replies and 3 Helpful likes by a writer who is not an admin: a traveler trashing, listing or restoring → refused ("Only the Lakat Iloilo team may …"); the admin trashes it (again → no change); in the Trash it is invisible to the backend's login, its writer and an admin's normal reads, its replies and likes are kept, and the Trash lists it with its counts and the admin's name; its writer editing it → 0 rows; its writer writing a new review of the place → allowed; restoring the old one meanwhile → refused (the sentence above); with the new one gone, Restore → visible to all three again with the same 12 replies and 3 likes; open place pages told twice (trash, restore).
- **Checked by the team on localhost (2026-11-13):** Delete review with its Undo on Reviews and Reports, the Trash page and Restore, the place page and profile, 320–425 px, keyboard, "not found" for a traveler. The team agreed to the design change ("it works on our end").
- Not yet checked: the live URL (round 30 is not committed yet).
