# 142 — Category icon and card photo

**What to build:** The category Edit also lets the admin choose an icon (one of about 16) and the card photo (one of its own places' photos, or "the first place's photo"). The home page's chip and card use them. The eight built-in categories start with their current icons and photos.

**Blocked by:** 141

**Status:** in progress

- [x] place_categories has icon and photo_place_id; only admins may change them
- [x] Edit shows the icon choices and the photos of that category's places
- [x] The home page chip and card use the chosen icon and photo; a photo that is not allowed shows the splash art
- [x] The eight built-in categories look the same until changed
- [x] Works with the keyboard alone, at 320, 375 and 425 px
- [ ] Works on the live URL

## Progress (2026-11-13)

- Database: supabase/sql/058-category-icon-and-card-photo.sql, run by the team ("it worked"; the photos table is now 059 and Trash 060): place_categories gets icon (one of 16, or empty for the default) and photo_place_id (one of its own places, checked by a trigger, or empty); only admins may change them (the 057 policy).
- Backend: GET /v1/categories and GET /v1/admin/categories carry icon and photo_place_id; PATCH /v1/admin/categories/:id takes any of name, icon, photo_place_id (null = back to the default; only what was sent changes), with plain refusals ("Please choose an icon from the list.", "Please choose a photo of one of this category's own places."). GET /v1/admin/places now also sends each place's photo, for the picker.
- Dashboard: Edit also shows "Icon on its card" (Default + 16, as radio buttons: arrow keys move between them) and "Photo on its card" (the default, then a thumbnail of each of its places that has a photo). Only what changed is sent.
- Home page: the category cards use the chosen icon (else the built-in one's own, else a pin or a bed) and the chosen place's photo (the splash art while its credits are not allowed; the default again if that place left the category). Built-in cards look exactly as before until changed.
- Also fixed while here (evaluation 2026-11-12, frontend rules): each category card was a `div` with a click, unreachable with a keyboard; its name is now a button that covers the whole card, with a focus ring on the card.
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` and the rule searches pass.
- Proof of the rules (rolled back, nothing kept): a traveler setting an icon → 0 rows; the admin setting "waves" → saved; "rocket" (not in the list) → refused; a photo of a Food place on Food → saved; a photo of a Mountain place on Food → refused ("Please choose a photo of one of this category's own places."); both back to the default → saved. GET /v1/categories answers 200 again.
- Browser (home page, reading only): 9 cards, each a button named after its category; the built-in cards keep their own photos; Tab moves from card to card with a white ring around the whole card.
- **Not yet checked (team, needs an admin login):** choosing an icon and a photo on the dashboard and seeing them on the home page, keyboard, 320–425 px.
- Team check (2026-11-13, localhost): a chosen icon and photo showed on the dashboard and the traveler home page; a chosen photo without the owner's permission showed the splash art on the card. "ticked all the boxes in ticket 142". Only the live URL is left (ticket 150).
