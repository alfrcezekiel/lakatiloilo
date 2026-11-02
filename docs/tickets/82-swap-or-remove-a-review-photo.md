# 82 — Swap or remove a review's photo

**What to build:** Editing a review can add a photo, swap it for another, or remove it. The old file is deleted from Storage when it is swapped or removed, so no unused photos are left behind.

**Blocked by:** 81

**Status:** done (confirmed by the team on the live URL, 2026-11-02)

- [x] PATCH /v1/reviews/:id can add, swap or remove the photo of the traveler's own review, with the same limits and message as ticket 81
- [x] The edit form shows the current photo, with Change and Remove
- [x] Swapping or removing a photo deletes the old file from Storage
- [x] Editing only the stars or text leaves the photo as it is
- [x] Works on the live URL

**Progress (2026-11-02):** No database change (027 already lets the writer set or clear photo_path, and refuses a photo outside their folder).

Backend: PATCH /v1/reviews/:id accepts JSON as before plus remove_photo, or form fields plus one optional "photo" file, with the same limits and message as POST. A new photo is checked and uploaded first, then the review is saved as the traveler: the old photo_path is read in the same transaction (only from the traveler's own review), and photo_path changes only when a new photo was sent or remove_photo is true; with neither it stays. After saving, the old file is deleted from Storage as the traveler; if saving fails, the new upload is deleted again.

Website: when editing a review with a photo, the form shows it ("Your review's photo") with Change photo and Remove photo. Remove photo switches back to "Add a photo"; choosing a new photo shows its preview, and removing that preview goes back to the current photo. Saving sends the new photo as form data, or remove_photo, or neither.

Checked:
- curl against the local backend: PATCH with a photo and no login 401; a text file named .jpg 400 with the photo message; a 5 MB file 400 with the photo message; JSON edits (with and without remove_photo) reach the login check as before.
- The two statements the edit uses, as a traveler through the backend's own login, in a rolled-back transaction: adding a photo, editing only the stars (photo stayed), reading the old photo before a swap, swapping, and removing all worked; swapping to a file in someone else's folder was refused ("That photo is not yours"); someone else's review was neither found nor changed.
- Browser with a pretend login and pretend backend answers (one preview tab; nothing sent to Supabase): editing showed the current photo with Change photo and Remove photo; changing only the stars sent remove_photo false; Remove photo then Save sent remove_photo true and the photo disappeared; choosing a new photo then Save sent form data with the file and the photo came back.
- Backend type-check, website type-check, lint and `npm run build` pass.

Found and fixed while building (no effect on the result): one of my edit scripts used a marker that also matched the likes route, so it briefly filled the reviews controller with copies of the new code. The copies were removed exactly (the restored file matched the version before the edit, and the type-check passed) before the change was made again with an exact edit.

Not checked: a real swap and removal with a real login, the old file being deleted from Storage after a swap or removal, and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** with a real login, swapping a review photo shows the new one and leaves only the new file in Storage; removing the photo empties it; editing only the stars keeps the photo. "Works on the live URL" stays open until ticket 82 is pushed and checked there.

**Confirmed by the team (2026-11-02):** checked on the live URL and marked done.
