# 116 — Categories and kinds

**What to build:** On the dashboard's Places screen, a "Categories and kinds" panel lists the destination categories and the accommodation kinds, each with how many places use it. An admin adds a new one by name (2 to 30 characters, not already used) and deletes one that no place uses.

**Blocked by:** None

**Status:** todo

- [x] A numbered SQL file adds the place_categories table with Row Level Security on and its policies (anyone may read; only admins may add and delete), starts it with the eight in use today, refuses deleting one that a place uses and refuses a place whose category or kind is not in it; the team has run it
- [x] An admin sees the categories and kinds with their place counts, adds a new category and a new kind, and deletes an unused one
- [x] A too short, too long or already used name, and deleting one in use, each show a plain message
- [x] A traveler cannot add or delete a category (refused by the database, and 401 or 403 from the endpoints, checked with curl)
- [x] Works with the keyboard alone, at 375 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-10)

- **SQL 047** (supabase/sql/047-place-categories.sql; the team ran it): the place_categories table.
  - It starts with the eight in use today.
  - Anyone reads; only admins add and delete; nobody renames.
  - A name is used once, whatever its capitals.
  - One in use cannot be deleted, and a place cannot get a category or kind that is not in the list.
  - It is on the Realtime list.
- **Backend:**
  - GET /v1/categories: anyone.
  - GET, POST and DELETE /v1/admin/categories: in their own admin controller, added to AdminOnlyMiddleware's list; adding and deleting run as the admin.
  - The id is made from the name ("Bed & Breakfast" becomes bed_and_breakfast).
- **Screen:** a "Categories and kinds" panel under the places list on /admin/places.
  - Two lists, destination categories and accommodation kinds, each row with how many places use it.
  - Delete with "Yes, delete" on unused ones; "In use" on the others.
  - An Add form with a name and "For" (destinations or accommodations).
  - A status line that takes the focus after Add or Delete.

Checked:
- **Rules**, through the backend's own login in a rolled-back transaction:
  - A traveler reads the 8 but cannot add (refused) or delete (0 rows).
  - The admin adds one and deletes an unused one.
  - The admin is refused on the same name in other capitals, a 1-letter name, renaming, and deleting one in use ("Some places still use it.").
- **curl:** GET /v1/categories answers the 8; the three admin endpoints answer 401 without a login and with a fake one.
- Website and backend type-check and lint, and `npm run build`.

Not checked:
- The panel in the browser (the test browser is not signed in as admin).
- A traveler's login at the endpoints (403).
- The guard on a place's category, which is tested in ticket 118, when admins may change it.
- The live URL.

**Team check (2026-11-10, localhost):** the team confirmed the panel: the lists with counts, Add, the plain messages, Delete on unused ones, the keyboard and 375 px. Still open: the live URL.

**Change (2026-11-11, team request):** "in /admin/places … adding a category I want to move it in a new clickable link in the sidebar instead of scrolling down to the bottom." The panel is now its own screen, /admin/categories, with "Categories" in the dashboard sidebar (after Places); /admin/places shows only the places. Same panel, same endpoints; the page's loading shape matches the panel.
