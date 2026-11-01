# 57 — Detail pages: Option 1A glass design

**What to build:** Restyle the destination and accommodation detail pages to "Option 1A" from the Detail Pages Glass design in Claude Design: big photo with a serif title, three glass tiles (type/category, area, rating), About, Reviews, and a glass side panel (Get in touch / Plan your visit). Same data as before, no new database columns.

**Blocked by:** none

**Status:** done (tested by the team on the live URL, 2026-11-01)

- [x] An accommodation page (e.g. Courtyard by Marriott Iloilo) matches Option 1A on a laptop: title, chips, tiles, side panel with Call and Email buttons
- [x] A destination page (e.g. Agony Hill) shows the same layout in teal, with "Plan your visit" (address and coordinates)
- [x] The Rating tile shows the same average and count as the Reviews section, and updates after writing, editing or deleting a review
- [x] On a phone the page has no sideways scrolling and the side panel comes after About
- [x] The loading skeleton has the same shape as the new page
- [x] Works on the live URL

**Progress (2026-11-01):** Built from a screenshot of Option 1A (the design file itself could not be read from this session). Shared parts in `src/components/PlaceDetail.tsx`; reviews now load once per page in `src/components/PlaceReviews.tsx` so the Rating tile and the Reviews section share them. Left out of the mockup: the Share and Save buttons (Save needs a new table; not in the MVP). The mockup's "District" tile shows our Area (Iloilo City / Iloilo Province), since places have no district column. Checked on localhost: measured at 375, 768, 1024 and 1440 px (no sideways scrolling; the title never runs under the side panel); the Rating tile read "★ 4.5 · 2 reviews", matching the Reviews section; the Call button links to `tel:+63333307600`. Type-check, lint and `npm run build` pass. Not checked: writing/editing a review on the new layout (needs a real login), and the live URL.

**Checked by the team on the live URL (2026-11-01):** every box above passed.
