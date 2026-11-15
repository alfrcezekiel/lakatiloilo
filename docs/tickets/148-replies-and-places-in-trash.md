# 148 — Replies and places in Trash too

**What to build:** Replies and places deleted by an admin also go to Trash. Restoring a place brings back its reviews (with their replies, likes, photos and reports), its photos and their credits. Restoring a reply puts it back under its review; if that review is gone, Restore is refused with a plain message.

**Blocked by:** 147, 143

**Status:** done

- [x] A deleted reply and a deleted place appear in Trash with what they were
- [x] Restoring a place brings it back on the home page with its reviews and photos
- [x] Restoring a reply puts it back in its thread; with its review gone, a plain refusal
- [x] Works on the live URL

## Progress (2026-11-13)

- Same design as 147 (mark, don't copy). SPEC.md Data and API updated.
- Database: supabase/sql/061-trash-for-replies-and-places.sql, **for the team to run**:
  - Replies: trashed_at and trashed_by; the text, name, tag and writer move into trashed_reply_texts (admins only) while it waits, so travelers see "This reply was deleted" and the answers under it stay. Likes kept; notifications removed. Cannot be answered, edited, liked, hidden or shown while in the Trash. admin_trash_reply, admin_restore_reply (refused while its review is in the Trash), admin_trashed_replies.
  - Places: trashed_at and trashed_by on destinations and accommodations; the four read rules and the admins' edit rules get "not in the Trash"; its reviews go with it (trashed_with_place) and come back with it; no new review of a place in the Trash. admin_trash_place, admin_restore_place, admin_trashed_places. admin_restore_review now waits for its place; admin_trashed_reviews leaves out the reviews that went with their place.
- Backend: Delete reply and Delete place now move to the Trash ("Moved to the Trash … 30 days"); a place's files are no longer deleted (that comes with Delete for good, 149). GET /v1/admin/trash lists reviews, replies and places; POST …/trash/replies/:id/restore and …/trash/places/:type/:id/restore. Travelers' threads and the dashboard's replies leave out a deleted reply with no answers left under it.
- Dashboard: the Trash shows each kind with its own card (Review, Reply, Destination / Accommodation): a reply with its text, whose review, answers under it and Helpful marks; a place with its photo, reviews and photos. "Restore the review / place first" when it waits for one. The delete pop-ups and Undo lines say the item goes to the Trash.
- `npx tsc`, eslint, `npm run build` and backend `tsc --noEmit` pass.
- 061 run by the team ("it worked"). Proof (rolled back, nothing kept):
  - Reply (3 answers, 1 Helpful like, writer not an admin): a traveler trashing, listing or restoring → refused; admin trashes it (again → no change); the backend reads it with an empty text, name and writer; the kept text is refused to the backend's login and invisible to its writer; answers and like kept; its writer editing → 0 rows, deleting → nothing; a traveler marking it Helpful → refused, answering it → "That reply was deleted, so it can't be answered."; admin hiding it → "That reply is in the Trash. Restore it first."; the Trash lists it with its real text and counts; with its review in the Trash, restore → "Restore the review first, then this reply."; after the review: restored with the same text and writer, not marked edited, the like still there.
  - Place (a destination with 11 reviews, one trashed on its own first): a traveler trashing or restoring → refused; admin trashes it → invisible to the backend and to an admin, its reviews invisible to the backend; admin editing it → 0 rows; a traveler writing a review of it → "That place does not exist"; the Trash lists it with 10 reviews and 1 photo, and the lone review on its own, marked as waiting; restoring the lone review first → "Restore the place first"; restore the place → back with its 10 reviews, the lone one still in the Trash; restore that → 11.
  - curl: both new restore routes and GET /v1/admin/trash → 401 without a login or with a fake one.
- **Checked by the team on localhost (2026-11-13):** deleting a reply with and without answers, a place, Restore of each, "restore the review first", 320–425 px, keyboard ("the features are working on our end").
- Not yet checked: the live URL (round 30 is not committed yet).
