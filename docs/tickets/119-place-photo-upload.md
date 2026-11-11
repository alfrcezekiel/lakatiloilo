# 119 — Place photo upload

**What to build:** In the Edit place form, "Choose a photo" opens the computer's file chooser: one JPG, PNG or WebP up to 2 MB, with a preview before saving. Saving replaces the place's photo everywhere on the site. No photo web address is typed anywhere.

**Blocked by:** 118

**Status:** todo

- [x] A numbered SQL file adds the place-photos Storage bucket (anyone may view; only admins may add, replace or delete; JPG, PNG or WebP up to 2 MB); the team has run it
- [x] An admin replaces a place's photo from a file on their computer; the new photo shows on the home page card and the place page, and the old uploaded file is deleted
- [x] A PDF, a renamed file of another kind or a photo over 2 MB is refused with a plain message
- [x] A traveler cannot upload a place photo (refused by Storage, and 401 or 403 from the endpoint, checked with curl)
- [x] Works at 375 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-11)

- **SQL 049** (the team ran it):
  - the place-photos bucket: public view; only admins add, replace and delete; JPG, PNG or WebP up to 2 MB
  - admins may change photo_url
  - photo_url must start with https:// (up to 500 characters); all 34 current places fit
- **Backend:** POST /v1/admin/places/:type/:id/photo (admin controller, so AdminOnlyMiddleware guards it):
  - checks the file by its first bytes and its size
  - uploads it as the admin into `<type>/<place id>/<random>.<ext>`
  - sets photo_url; if that fails, the new file is deleted again
  - deletes the old photo if it was an uploaded one (Wikimedia and Unsplash addresses are left alone)
- **Edit form:**
  - a Photo section showing the current photo, "Choose a photo" (the computer's file chooser), a preview with an amber border, and "Keep the current photo"
  - a plain message for a wrong file
  - Save turns on when a photo is chosen, and saves the fields first, then uploads the photo ("Saving and uploading…")

Checked:
- **Rules**, through the backend's own login in a rolled-back transaction:
  - a traveler cannot upload a place photo (refused) or change a photo address (0 rows)
  - the admin can do both
  - refused: an http:// address, and the admin uploading into someone's review-photo folder
  - deleting files has to go through the Storage API, which the backend uses
- **curl:** the photo endpoint answers 401 without a login and with a fake one; GET /v1/destinations still 200.
- Website and backend type-check and lint, and `npm run build`.

Not checked:
- an upload in the browser (needs the admin's login)
- deleting the old file through the Storage API
- a traveler's login at the endpoint (403)
- 375 px
- the live URL

**Team check (2026-11-11, localhost):** the team confirmed every box on localhost. Still open: the live URL.
