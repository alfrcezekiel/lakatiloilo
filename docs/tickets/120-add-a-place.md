# 120 — Add a place

**What to build:** On the Places screen, "Add a place" opens the same form, empty: Destination or Accommodation, every field, and a required photo. Saving shows the new place on the site at once.

**Blocked by:** 119

**Status:** done

- [x] A numbered SQL file lets admins add places (everyone else still cannot); the team has run it
- [x] An admin adds a destination and an accommodation, each with a photo; each shows on the home page and has its own page
- [x] A missing field or a missing photo shows a plain message, and nothing is saved
- [x] A traveler cannot add a place (refused by the database)
- [x] Works with the keyboard alone, at 375 px and on a laptop
- [x] Works on the live URL

## Progress (2026-11-10)

- `supabase/sql/050-admins-add-places.sql`: admins may add destinations and accommodations (insert policy asking `is_admin()`, insert only on the form's columns); a new place must have a photo and a description. The team ran it ("it worked").
- Proved in a rolled-back transaction through the backend's login (nothing kept): a traveler's insert is refused (42501, Row Level Security); an admin adds a destination (map position set from the latitude and longitude) and an accommodation; refused: no photo, an empty description, a position outside Iloilo, an unknown category, setting `created_at`.
- Backend: `POST /v1/admin/places/:type` (form data + required file "photo"). Checks the fields like Edit, chooses the id, uploads the photo, adds the place; if adding fails, the uploaded photo is deleted again. Checked with curl: 401 without a login and with a fake login.
- Frontend: "Add a place" button on /admin/places opens `/admin/places/new`: the Edit form, empty, with Destination / Accommodation, a required photo with a preview, "Add place". After adding: "<name> was added", with View the place page, Edit it, Add another place. `/admin/places/new` answers 404 without an admin login (checked with curl).
- `npx tsc`, eslint, backend `tsc --noEmit` and `npm run build` pass.
- Team check (2026-11-10, localhost): added places as an admin, refusal messages, keyboard and 375 px all confirmed ("ticked all the boxes of ticket 120").
- **Not yet checked:** the live URL.

**Change (2026-11-11, team request):** the screen after adding a place has its own design instead of a plain line with a small photo. A showcase card: the photo large with a dark fade, the name in the heading font, "New accommodation/destination added", its kind and location as labels, and a "Live on the site" badge (its dot pulses only when the device allows motion); beside it (under it on phones), "<name> was added", the address, the first three lines of the description, and three "What's next" tiles with an icon and a hint (View the place page, Edit it, Add another place). The card still takes the focus and is read out. Hover brightens a tile's border and name only (no tint, no blur). Checked on a temporary preview page with an existing place's details (no place was added; the page was deleted): 320, 375, 425, 768, 1024, 1280 and 1440 px, nothing wider than the screen, tiles 64 px tall. **Not yet checked:** after really adding a place, and the keyboard alone.
- Team check (2026-11-11, localhost): the new "place added" card was confirmed ("the cards looks new with a new UI").
