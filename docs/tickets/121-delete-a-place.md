# 121 — Delete a place

**What to build:** Each place gets "Delete" with a "Yes, delete" step that says how many reviews go with it. The place, its reviews (with their replies, likes, reports, photos and notifications) and its uploaded photo are removed.

**Blocked by:** 118

**Status:** done

- [x] A numbered SQL file lets admins delete places and deletes a place's reviews with it; the team has run it
- [x] The step says how many reviews will be deleted; after "Yes, delete" the place and its reviews are gone from the site, and Cancel changes nothing
- [x] The place's uploaded photo and its reviews' photo files are deleted from Storage
- [x] A traveler cannot delete a place (refused by the database)
- [x] Works on the live URL

## Progress (2026-11-10)

- `supabase/sql/051-admins-delete-places.sql`: admins may delete destinations and accommodations (delete policy asking `is_admin()`); a trigger deletes the place's reviews in the same step (reviews point at places by place_type and place_id, with no foreign key). It runs as the admin, so the reviews' own rules (040) decide too. The team ran it ("it worked").
- Proved in a rolled-back transaction through the backend's login (nothing kept): a traveler's delete changed 0 rows and the place stayed with its 10 reviews; an admin's delete removed the destination with its 10 reviews, 1 reply, 22 likes and 6 photo rows; an accommodation's 7 reviews went with it; the other 154 reviews were untouched.
- Backend: `DELETE /v1/admin/places/:type/:id` → 200 `{ id, message }`, 404 for an unknown place. In one transaction it notes the place's photo address and its reviews' photo files, then deletes the place; afterwards it deletes those files from Storage as the admin (older Wikimedia and Unsplash addresses are left alone). `GET /v1/admin/places/:type/:id` also answers `review_count` (hidden reviews included). Checked with curl: 401 without a login and with a fake login.
- Frontend: under the Edit form, "Delete this place" → **Delete place** → "Delete <name> for good? Its N reviews will be deleted too…" with **Yes, delete** and **Cancel** (Cancel puts the focus back on Delete place). After deleting, the admin is back on /admin/places with "<name> was deleted, with its reviews and photos." The home page and an open place page already update by themselves (Realtime listens for deletions; the place page then shows "not found").
- `npx tsc`, eslint, backend `tsc --noEmit` and `npm run build` pass.

**Change (2026-11-10, team request):** "Delete" was at the bottom of the Edit form, so the admin had to scroll to find it. It is now a **Delete** button on each row of the Places list (next to Edit) and at the top of the Edit form, and it opens a **confirmation pop-up** (the browser's own `<dialog>`) with the same text: "Delete <name> for good? Its N reviews will be deleted too, with their replies, Helpful marks, reports and photos. Its photo is deleted too. This cannot be undone." with **Cancel** (focused first, so Enter never deletes by accident) and **Yes, delete**. Escape or a click outside the box works like Cancel. Deleted from the list: the row goes and the focus moves to "<name> was deleted…"; from the Edit form: back to the list with the same line. `GET /v1/admin/places` now also answers each place's `review_count` (checked: 171 reviews over 38 places, the same as the reviews table).

**Change (2026-11-10, team request, second):** the Delete button inside the Edit form is removed. Delete is only on the Places list rows, next to Edit.

- Team check (2026-11-10, localhost): "ticked the boxes of ticket 121, it operates efficiently in local." Also fixed the same day (team report): the "For" dropdown in Add a new category was the browser's own solid box with its arrow against the edge; now drawn like the Name box with its own arrow (measured 44 px high, same top as Name and Add, at 1100 and 800 px; stacked full width at phone size).
- **Was not yet checked:** deleting as a real admin, the Storage files really gone, the keyboard and 375 px — for the team to test. Undo after a delete comes in ticket 127.

- **Not yet checked:** the live URL.
