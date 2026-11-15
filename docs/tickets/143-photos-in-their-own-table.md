# 143 — Place photos move to their own table

**What to build:** Each place's photo, with its credits, becomes "photo 1" in a new place photos table, so a place can later have several. Nothing changes for travelers or admins: the cards, place pages, credit lines, splash art, "Credit missing" and the photo upload on Edit all work as before.

**Blocked by:** None

**Status:** in progress

- [x] The place_photos table exists with Row Level Security; only admins may add, move or delete photos; the backend reads them (proved with a rolled-back test)
- [x] Every place's photo is its photo 1, and its credits belong to that photo
- [x] The home page, place pages, /credits and the dashboard look and behave exactly as before
- [x] Replacing a photo on Edit still works
- [ ] Works on the live URL

## Progress (2026-11-13)

- Database: supabase/sql/059-place-photos.sql, run by the team ("it worked"). place_photos (place, photo address, position 1–6, 1 = cover; admins write, admins and the backend's login read); every place's photo becomes its photo 1; a place's photo_url stays as a copy of its cover, kept in step by the database (setting photo_url on Add or "replace photo" sets photo 1), so everything that reads photo_url is unchanged; credits get photo_id (one row per photo instead of per place; today's move to photo 1); deleting a place deletes its photos and their credits.
- Backend: credits are read and saved through the cover photo (photo 1); "Credit missing" asks whether any photo of the place lacks allowed credits; deleting a place removes every one of its photo files; GET /v1/photo-credits carries each credit's photo_id (the Photo credits page keys its items by photo).
- Snapshot taken before 059, to compare after: 3 allowed credits, 42 places with "Credit missing", and a fingerprint of every place's photo address.
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` pass.
- Same as before 059 (checked against the snapshot): the 3 allowed credits (place, line, licence, link) are identical; every place's photo address is identical (same fingerprint); 45 places, 45 covers, 45 photos, no credit without a photo, no cover different from its place's photo_url; the Places list has 45 places and 42 "Credit missing" (as before); the public answers show the same 3 destination photos with their credit lines; GET /v1/photo-credits lists the same 3 credits, each with its photo_id.
- Proof of the rules (rolled back, nothing kept): a traveler reads 0 photos and cannot add one; an admin reads all 45; replacing a place's photo_url sets its photo 1 to the same address; a second photo at a taken position → refused; position 7 → refused; deleting a place deletes its photos and their credits.
- **Not yet checked (team):** the site looks and works the same: home page cards, place pages, credit lines, splash art, /credits, "Credit missing", and "replace photo" plus credits on Edit and Add a place.
- Team check (2026-11-13, localhost): "it worked as before". "ticked all the boxes of ticket 143". Only the live URL is left (ticket 150).
