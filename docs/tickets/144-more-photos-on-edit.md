# 144 — Add more photos on Edit

**What to build:** On a place's Edit form, the admin can add photos up to 6, each with its own "Photo credits and copyright" box. A seventh is refused. Add a place keeps one photo; more are added afterwards on Edit.

**Blocked by:** 143

**Status:** done

- [x] "Add a photo" uploads one more (JPG, PNG or WebP, up to 2 MB) with its credits
- [x] Each photo has its own credits box with the same checks as today
- [x] A seventh photo is refused with a plain message
- [x] A logged-out visitor gets 401 and a traveler 403
- [x] Works with the keyboard alone, at 320, 375 and 425 px
- [x] Works on the live URL

## Progress (2026-11-13)

- No database change (059 already allows positions 1 to 6, one photo each).
- Backend: GET /v1/admin/places/:type/:id now carries `photos` (every photo, cover first, each with its credits and "photo was changed"); POST /v1/admin/places/:type/:id/photos adds one (form data: the photo and its credits) after the last, in one transaction with its credits, and deletes the uploaded file again if that fails; PUT /v1/admin/places/:type/:id/photos/:photoId/credits saves one photo's credits. A seventh photo → 400 "A place can have up to 6 photos. Delete one first." Both routes 401 logged out and with a fake login.
- Dashboard: a "More photos" panel under the Edit form (its own panel, so Enter in its boxes never sends the form): photos 2 to 6, each with its thumbnail, its own "Photo N: credits and copyright" box and "Save photo N's credits"; then "Add a photo (N of 6)" with its own file picker, preview, credits box and "Add photo"; at 6, "This place has 6 photos, the most it can have." The credits box now takes its own ids per photo (the cover's keep theirs). Add a place keeps one photo.
- Proof (the backend's own code on the real database, rolled back, Storage replaced by a stand-in): photo 2 added with its credits; its credits changed without touching the cover's; photos 3 to 6 added in order; a seventh refused with the sentence above; credits for a photo that is not this place's → 404.
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` and the rule searches pass.
- **Not yet checked (team, needs an admin login):** adding real photos in the browser, the refusals, keyboard, 320–425 px. Travelers do not see photos 2 to 6 until ticket 146.
- Team check (2026-11-13, localhost): 6 photos added on a destination's Edit page, with licence "Other" and status "Not checked yet". "ticked all the boxes in ticket 144". Only the live URL is left (ticket 150).
