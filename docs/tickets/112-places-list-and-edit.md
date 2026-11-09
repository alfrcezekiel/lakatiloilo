# 112 — Places: list and edit

**What to build:** The dashboard's Places screen lists every destination and accommodation in one searchable list (name, type, category or kind, address). Edit opens a glass form with the name, description and address (and contact details for accommodations), Save and Cancel; saved changes show on the site at once. Admins cannot add or delete places in this round.

**Blocked by:** 107

**Status:** todo

- [x] A numbered SQL file lets admins change only those columns of destinations and accommodations; everyone may still read; the team has run it
- [x] An admin finds a place by searching, edits a destination's and an accommodation's description and address, and the change shows on the place page
- [x] Empty or too long fields show a plain message; Cancel changes nothing
- [x] A traveler cannot change a place (refused by the database, and 403 from the endpoint, checked with curl)
- [x] Works with the keyboard alone, at 375 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-08)

- **SQL 043** (supabase/sql/043-admins-edit-places.sql; the team ran it):
  - admins may update only name, description and address (plus phone and email on accommodations); everyone still reads
  - the database checks lengths: name 1–100, address 1–200, description 1–1000, phone ≤ 40, email ≤ 120
  - found and closed while here: Supabase had given anon and authenticated full insert, update and delete on both place tables. RLS still blocked every write (no write policies), but now the permissions match.
- **Backend:**
  - GET /v1/admin/places (A to Z)
  - GET /v1/admin/places/:type/:id
  - PATCH /v1/admin/places/:type/:id (admin-places.service.ts), with a plain message per field (400) and 404 for an unknown type or id
  - all run as the admin, and AdminOnlyMiddleware guards them
- **Screens:**
  - /admin/places: search by name, address or kind; All / Destinations / Accommodations; a count; an Edit link on each row
  - /admin/places/<type>/<id>: a glass form with a message under each field, a description counter, and phone and email for accommodations only. Save stays off until something changes. Saving shows "Saved. The change shows on the site now." with a link to the place page. Cancel goes back without saving.
  - Places in the sidebar is now a link, and it stays marked while editing a place.

Checked:
- **Rules**, through the backend's own login in a rolled-back transaction:
  - a traveler's edit changes 0 rows; adding or deleting a place is refused
  - the admin edits a destination's description and address and an accommodation's phone and email
  - the admin is refused changing a photo or category, adding or deleting a place, an empty name, and a 1001-character description
  - the backend's own login cannot edit
- **curl:** all three endpoints answer 401 without a login and with a fake one; the PATCH preflight answers 204; /admin/places and an Edit page answer 404 when logged out.
- Website and backend type-check and lint, and `npm run build`.

Not checked: the screens in the browser (the test browser is not signed in as admin), a traveler's login at the endpoints (403), and the live URL.

**Change (2026-11-08, team request):** the place search box showed two clear "x" buttons (the browser's own and ours). The browser's is hidden, so one remains; the team confirmed it.

**Team check (2026-11-09, localhost):** the admin searched, then edited a destination and an accommodation (name, description, address, phone, email), and the changes showed on the site; it works at phone size; a traveler gets "not found" at /admin/places. Still open: the live URL.
