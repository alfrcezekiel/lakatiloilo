# 146 — Photo row on the place page

**What to build:** The place page shows the cover across the top as today, and a row of the other allowed photos that opens the same photo viewer as reviews, each photo with its own credit line. A photo whose credits are not allowed is left out; with no allowed photo, the splash art shows. "Credit missing" on /admin/places shows while any photo of the place lacks allowed credits.

**Blocked by:** 144

**Status:** in progress

- [x] The public answer for a place lists only its allowed photos, cover first, with their credit lines (checked with curl)
- [x] The photo row opens the viewer; each photo's credit line shows with it
- [x] A place with no allowed photo still shows the splash art
- [x] "Credit missing" follows every photo of the place
- [x] Works with the keyboard alone and a screen reader, at 320, 375 and 425 px
- [ ] Works on the live URL

## Progress (2026-11-13)

- No database change.
- Backend: GET /v1/destinations/:id and GET /v1/accommodations/:id carry `photos`: the place's photos 2 to 6 whose credits are allowed, in order, each with its credit line, licence and link (never the status). The cover at the top keeps its rule (its own credits allowed, else the splash art). curl: all 45 places answer `photos`; Kasadyahan sa Kabanwahanan has 1 allowed extra photo; no status anywhere.
- Place pages: a "Photos" section after About, only when there are any: small squares that open the same photo viewer as reviews (Previous / Next, arrow keys, "2 of 4" read out, Escape closes and the focus goes back), now with the photo's credit line under it, linked to the original. The viewer's wording follows: "Photos of <place>", "Photo 1 of 3 of <place>". Reviews keep theirs.
- "Credit missing" already checks every photo (ticket 143).
- Bug found and fixed while checking: passing a function from the server-drawn place page to the viewer crashed the page ("Functions cannot be passed directly to Client Components"); the viewer now takes the place's name as plain text.
- Also fixed (not from this ticket): at 320 px the long word "Kabanwahanan" in the big place title ran 7 px past the screen; the title now breaks a word that is too long. Re-measured: nothing wider than the screen at 320 and 375 px.
- Browser (Kasadyahan sa Kabanwahanan, reading only): the Photos section with 1 square; Enter opens the viewer, read out as "Photos of Kasadyahan sa Kabanwahanan", alt "Photo 1 of 1 of …", credit line "Photo: Patrickroque01, CC BY-SA 4.0" linked; Escape closes and the focus returns to the square.
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` pass.
- **Not yet checked (team):** a place with several allowed photos (Previous / Next), a place whose extra photos are "Not checked yet" (no section), a screen reader.

**Change (2026-11-13, team request):** "make it a larger photo when clicked based on uploaded resolution/size in admin; the credits line should be at the bottom of web page; the previous and next arrows should be at the middle of the photo; whether there are no previous or next photos it shouldn't go to either". The place photos now have their own viewer (the reviews' viewer is back exactly as it was): it fills the screen and shows each photo at the size it was uploaded, only made smaller when it is bigger than the screen, never stretched; Previous and Next are round buttons at the photo's vertical middle, just beside its left and right edges, so they never cover it, even a small photo; on the first photo Previous does nothing and is greyed out, on the last Next does (no going round), the arrow keys follow the same rule, and the buttons stay focusable so the keyboard focus is not lost; "2 of 4" and the credit line (linked to the original) are at the bottom of the screen. Checked on a temporary preview page with three photos of different sizes (deleted afterwards): a 1920 × 1080 photo scaled to fit a 1920 × 1087 screen, a 268 × 56 one shown at its own size; the arrows' middles on the photo's middle, no overlap with the photo; ArrowLeft on the first and ArrowRight on the last change nothing; Tab and Enter open the chosen photo, Escape gives the focus back; at 320 and 375 px nothing off the screen, arrows 44 × 44 px, the photo 208 px wide at 320. `npx tsc`, eslint and `npm run build` pass.

**Change (2026-11-13, team request, second):** "the arrows … should be fixed at the middle left and right corner of the webpage; the photo's row … a unique design, intuitive, visual appealing, user-friendly and better typography."
- Viewer: Previous and Next are fixed at the middle of the screen's left and right edges (20 px in on a laptop, 8 px on a phone), the same place for every photo; the photo keeps clear of them. The viewer now fills the visible area (not the full window width, which counted a scrollbar and pushed the right arrow over the photo at 375 px).
- The Photos section: "Photos" in the site's serif with a count pill ("4 photos") and a hint ("Tap a photo to see it larger. Each photo shows its photographer's credit."); the photos as a mosaic with no gaps: 1 a wide tile, 2 two halves, 3 the first large with two wide tiles stacked beside it, 4 the first large with two squares and a wide tile, 5 the first large with four squares; on phones the first spans the width and the rest go two per row. Each tile: rounded corners, the photographer's credit with a camera icon on a soft dark fade at its foot, an enlarge mark on hover or keyboard focus, a slight zoom on hover only when the device allows motion, a white ring for the keyboard.
- Checked on a temporary preview page with 1 to 5 sample photos (deleted afterwards) and on Kasadyahan sa Kabanwahanan (4 allowed photos): every layout fills its rows; the arrows' middles at the screen's middle (516 of 1031 px) for a wide and a tall photo, the photo clear of them; at 320, 375 (with a scrollbar) and 425 px nothing off the screen, the arrows 44 × 44 px, 8 px from each edge. `npx tsc`, eslint, `npm run build` and the rule searches pass.

**Change (2026-11-13, team request, third):** "when clicked in the first photo the arrow shouldn't appear at the start of the photo gallery, then in the end the next arrow shouldn't be displayed also." The first photo now has no Previous arrow and the last no Next (they were greyed out); one photo shows none. When the arrow that had the keyboard focus goes (reaching the first or last photo), the focus moves to the arrow still shown, after the screen has updated (a first try moved it too early and the focus was lost; found while checking). Checked on Kasadyahan sa Kabanwahanan (5 photos), with the keyboard: photo 1 shows only Next; photo 4 both; Next on photo 4 → photo 5, only Previous shown and focused; Previous four times → photo 1, only Next shown and focused; ArrowLeft on photo 1 changes nothing. `npx tsc`, eslint and `npm run build` pass.
- Team check (2026-11-13, localhost): the Photos mosaic and the viewer (arrows fixed at the screen's edges, hidden at the first and last photo) "now worked". "ticked all the boxes in ticket 146". Only the live URL is left (ticket 150).
