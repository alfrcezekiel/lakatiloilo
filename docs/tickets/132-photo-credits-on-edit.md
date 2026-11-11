# 132 — Photo credits on Edit

**What to build:** On a place's Edit form on /admin/places, a "Photo credits and copyright" box right below the photo upload, for destinations and accommodations. The admin fills in Photographer, Publisher / website, Original photo URL, Copyright licence, Authorization status and Attribution / photo credits, and saves them. The credit line fills itself in from the other fields, and the admin can change it. The credits are kept in a new table that anyone may read and only admins may change, so every photographer can be credited and the team knows which photos are allowed.

**Blocked by:** None (best started after round 28 is pushed, ticket 128)

**Status:** in progress

- [x] The new place_photo_credits table exists with Row Level Security on: anyone may read, only admins may add, change or delete; deleting a place deletes its credits (proved with a rolled-back test)
- [x] The Edit form shows the box below the photo with the six fields; Photographer, Copyright licence, Authorization status and Attribution / photo credits are required
- [x] The credit line fills itself in (e.g. "Photo: Riyan0721 / Wikimedia Commons, CC BY-SA 4.0") until the admin types their own
- [x] Saving is refused with a plain message for a missing required field, a field that is too long, an original URL that does not start with https://, and "All rights reserved" without "Permission from the owner" (the database refuses it too)
- [x] Opening Edit again shows the saved credits; a place with none yet shows an empty box
- [x] After a new photo is uploaded, the box says "Check these credits: the photo was changed." until the credits are saved again
- [x] A logged-out visitor gets 401 and a traveler 403 when saving credits (checked with curl)
- [x] Works with the keyboard alone, at 320, 375 and 425 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-11)

- Database: supabase/sql/054-place-photo-credits.sql, run by the team ("it worked").
- Backend: `PUT /v1/admin/places/:type/:id/credits` saves the credits as the admin and answers the place; `GET /v1/admin/places/:type/:id` (and every place answer on the dashboard) now carries `credits` with `photo_changed`. PUT added to CORS. curl: 401 logged out and with a fake login.
- Frontend: the "Photo credits and copyright" box sits right below the photo on Edit, with the six fields, the self-filling credit line ("Use the suggested line" brings it back after typing your own), the same checks as the backend, and the "Check these credits: the photo was changed." notice. Save sends the fields, then the photo, then the credits. A place with no credits can still be saved without filling them in.
- `npx tsc`, eslint, backend `tsc --noEmit` and the rule searches pass.
- Proof of the rules (rolled back, nothing kept), acting as each person: RLS on with 5 policies; a traveler adding credits → refused (42501); changing or deleting them → 0 rows; the admin: All rights reserved + Allowed by its licence → refused (23514), an http:// URL → refused, an empty photographer → refused, a place that does not exist → refused ("That place does not exist."), setting updated_by himself → refused; the backend's own save → saved, updated_by = the admin, saved for the current photo, read back with photo_changed false, and true for another photo; the public backend login reads them and cannot add any; deleting the place → its credits gone.
- Browser (Edit on Breakthrough Restaurant, nothing saved; every save request blocked in the tab): the box sits right below the photo; typing Riyan0721, Wikimedia Commons and CC BY-SA 4.0 filled in "Photo: Riyan0721 / Wikimedia Commons, CC BY-SA 4.0"; All rights reserved changed it to "…, used with permission"; Save with All rights reserved + Allowed by its licence showed the plain message under Authorization status, moved the focus there, and sent nothing. At 425, 375 and 320 px each field takes the full width, nothing is wider than the screen.
- **Not yet checked (team):** really saving credits and opening Edit again, the "photo was changed" notice after uploading a new photo, the keyboard alone, and 403 for a traveler (needs a traveler login).
- Team check (2026-11-11, localhost): credits saved and still filled in on reopening Edit; after a new photo the "photo was changed" notice showed, and saving again cleared it (database: credits saved 1 s after the new photo, for that photo). "ticked all the boxes of ticket 132". Only the live URL is left (ticket 137).
