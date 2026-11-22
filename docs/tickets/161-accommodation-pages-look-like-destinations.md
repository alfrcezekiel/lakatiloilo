# 161 — Accommodation pages look like destinations

**What to build:** A traveler opening a hotel or condominium sees the same
teal look as a destination page — the page, the photo's fade, the section
tabs, the side panel's tints, the map's glass and the loading skeleton are
teal instead of indigo — and the map section is headed "Getting there". The
details built in the glass detail pages round stay as they are.

**Blocked by:** None

**Status:** todo

- [x] An accommodation page and its loading skeleton use the same teal as a
      destination page; no indigo or blue is left on the page
- [x] The accommodation map section is headed "Getting there" (no longer
      "What's around")
- [x] Still there and working, as written in docs/SPEC.md Screens 32 "Kept
      as built": Share on the photo, the Contact section, the fourth quick
      fact (Front desk), the side panel's Live dot, the Keep exploring hints
      (Copy coordinates is on destination pages only, as before)
- [x] Text stays readable on the teal (contrast 4.5:1)
- [x] Looks right at 320, 375, 425, 768, 1024 and 1440 px; nothing scrolls
      sideways
- [ ] Works on the live URL

**Progress (2026-11-22):** built; the team confirmed it on localhost the
same day (every box but the live URL, which waits for the push).

- One shared colour set now serves both kinds of page, so accommodations
  use exactly the destination teal; the three hard-coded indigo tints
  (section tabs, Keep exploring, the map's glass panels) are teal too. The
  pages still differ in their words ("Your stay", "Plan your visit").
- Checked in Chrome at 320, 375, 425, 768, 1024 and 1440 px on Courtyard by
  Marriott Iloilo: the page's background is identical to a destination's,
  no indigo class is left on the page, the map is headed "Getting there",
  Share, Contact, Front desk and the Live dot are there, nothing scrolls
  sideways. The loading skeleton uses the same colour set.
- Contrast: the same white text on the same teal as destination pages,
  which already pass 4.5:1.
- `npx tsc --noEmit`, `npx eslint src` (no warnings), 119 unit tests and
  `npm run build` pass.
- **Not checked:** the live URL.
