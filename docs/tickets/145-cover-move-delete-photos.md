# 145 — Cover, move and delete photos

**What to build:** On Edit, the admin makes any photo the **cover** (the home page cards use it), moves photos earlier or later with arrow buttons, and deletes one after a pop-up. The last photo cannot be deleted.

**Blocked by:** 144

**Status:** in progress

- [x] "Make it the cover" changes the photo on the home page cards
- [x] The arrow buttons move a photo; the order is kept after a reload
- [x] Delete removes a photo and its file; deleting the last one is refused
- [x] Works with the keyboard alone (each button names its photo), at 320, 375 and 425 px
- [ ] Works on the live URL

## Progress (2026-11-13)

- No database change.
- Backend: PATCH /v1/admin/places/:type/:id/photos/:photoId { position } moves a photo (the others shift, positions stay 1, 2, 3 … with no gap; position 1 is the cover, and the place's photo_url follows it, so the cards, the cover's credits and the splash rule follow too); DELETE …/photos/:photoId deletes a photo with its credits and its file (the ones after it move up; deleting the cover makes photo 2 the cover). Both in one transaction, the photos locked meanwhile. 400 "A place needs at least one photo. Add another before deleting this one." for the last photo; 404 for a photo not this place's; 401 logged out and with a fake login.
- Dashboard: "Order and cover" at the top of the More photos panel: every photo in order with its thumbnail ("Cover" on photo 1) and four equal buttons, ← (earlier), → (later), ★ (make it the cover) and the bin (Delete, after a pop-up that says when it is the cover). Each button names its photo for screen readers. A new cover reloads the Edit form above, so its photo and credits box show the new cover's (the hint says to save other changes there first).
- Proof (the backend's own code on the real database, rolled back, Storage replaced by a stand-in): three photos; photo 3 → cover (the place's photo_url and the cover's credits follow); the cover → position 3 (back as it was); deleting photo 1 makes photo 2 the cover and deletes its file; deleting down to one photo, then the last → refused (400, the sentence above); another place's photo → 404.
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` and the rule searches pass.
- **Not yet checked (team, needs an admin login):** in the browser, the cards following a new cover, keyboard, 320–425 px.
- Team check (2026-11-13, localhost): photos moved and a new cover made on a destination; a seventh photo was refused. "ticked all the boxes in ticket 145". Only the live URL is left (ticket 150).
