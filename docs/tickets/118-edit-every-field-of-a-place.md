# 118 — Edit every field of a place

**What to build:** The Edit place form gains the category (destination) or kind (accommodation), Iloilo City or Iloilo Province, and the latitude and longitude. Saved changes show on the site at once.

**Blocked by:** 116

**Status:** todo

- [x] A numbered SQL file lets admins change those columns too, checks that the latitude and longitude are inside Iloilo, and keeps the map position in step with them; the team has run it
- [x] An admin changes a destination's category and location and an accommodation's kind, and the place moves to the right list on the home page
- [x] A latitude or longitude outside Iloilo, or not a number, shows a plain message
- [x] A traveler cannot change these fields (refused by the database)
- [x] Works with the keyboard alone, at 375 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-10)

- **SQL 048** (the team ran it): admins may also change the category or kind, location_type, latitude and longitude; the position must be inside Iloilo (latitude 10.4–11.7, longitude 121.8–123.3); a trigger keeps the map position in step.
- **Backend:** GET and PATCH /v1/admin/places/:type/:id read and save the new fields, with a plain message for a missing category, a wrong location, or a position outside Iloilo.
- **Edit form:** Category (or Kind) and Location lists, and Latitude and Longitude fields with hints and a message under each. The category list comes from GET /v1/categories.

Checked:
- **Rules**, through the backend's own login in a rolled-back transaction:
  - a traveler changes nothing
  - the admin changes a category, a location and a kind
  - refused: an unknown category, a kind on a destination, a wrong location, a latitude in Manila, and an empty longitude
  - after a move, the map position matches the new latitude and longitude
- Website and backend type-check and lint, and `npm run build`.

Not checked: the form in the browser, curl on the changed endpoints after the watcher reloaded, 375 px, and the live URL.

**Team check (2026-11-11, localhost):** the team confirmed every box on localhost. Still open: the live URL.
