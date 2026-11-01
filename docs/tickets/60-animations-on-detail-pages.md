# 60 — Animations on the detail pages

**What to build:** Destination and accommodation pages move gently, using Motion (formerly Framer Motion). The chips, title and address fade up when the page opens; the tiles, About and Reviews fade in as the traveler scrolls to them; a new review slides in at the top of the list and a deleted one shrinks away. Travelers who turn on "reduce motion" see no movement.

**Blocked by:** 59

**Status:** done (tested by the team on the live URL, 2026-11-01)

- [x] The chips, title and address fade up when a detail page opens
- [x] The tiles, About, the side panel and Reviews rise in on page load if on screen, fade up while scrolling down and fade down while scrolling up, every time
- [x] A new review slides in; a deleted review shrinks away
- [x] With "reduce motion" turned on, nothing slides or fades: content just appears
- [x] The page still arrives filled in from the server (the text is there before animations start), and nothing jumps when the loading skeleton is replaced
- [x] Works on the live URL

**Change (2026-11-01, team request):** the team asked for the animations to be clearly visible: text and cards on screen rise in when the page loads or is refreshed, rise up while scrolling down, come down from above while scrolling back up, and do this every time they return to the screen (they fade out when they leave), instead of once. The same shared fade (Reveal) is used on the home page and the detail pages.

**Progress (2026-11-01):** Installed Motion (version 12) and set it, for the whole site, to follow the device's "reduce motion" setting (animations then finish instantly). The chips, title and address rise one after another when a detail page opens; this one is plain CSS, so it starts as soon as the page is painted and never waits for JavaScript. About, the side panel and Reviews fade up the first time they scroll into view; anything already on screen when the page opens is left alone, so nothing is hidden while a slow phone loads. The review list slides a new review in at the top and shrinks a deleted one away, while the others glide into place; reviews already there when the page opens do not move. If the only review on a place is deleted, it disappears without the shrink (the list itself goes away).

Checked on localhost at 375 px: the page's HTML from the server has the title and address with nothing hidden; on the production build the chips, title and address each played the fade-up and ended fully visible; Reviews (below the screen) started hidden and faded in after scrolling, while About and the side panel (on screen) stayed as they were. Type-check, lint and `npm run build` pass. Your running dev server did not pick up the new CSS, so restart `npm run dev` before testing the fade-up. Not checked: the review list animations (need a real login), and "reduce motion" (this browser cannot switch it on); please test both. On Windows: Settings → Accessibility → Visual effects → Animation effects off. Not checked: the live URL.

**Checked by the team on localhost (2026-11-01):** the page-load and scroll animations (fade up, fade down, every time) look good.

**Checked by the team on the live URL (2026-11-01):** every box above passed.
