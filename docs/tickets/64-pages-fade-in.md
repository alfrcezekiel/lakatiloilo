# 64 — Pages fade in

**What to build:** Moving between pages (home, a destination or accommodation page, login, photo credits, and back) makes the new page fade in quickly, in about a third of a second. The fade changes only how see-through the page is, with no movement, so the floating navbar and scroll-to-top button stay in place. The fade-ups inside each page still play. With "reduce motion" on, pages just appear.

**Blocked by:** None

**Status:** in progress

- [ ] Opening a place from the home page, going back, and opening login or photo credits each fade the new page in
- [ ] The floating navbar and scroll-to-top button stay in place during the fade
- [ ] The text and cards inside each page still rise in as before, and the page still arrives filled in from the server
- [ ] With "reduce motion" turned on, pages just appear
- [ ] Nothing shifts sideways at 375, 768, 1024 and 1440 px wide
- [ ] Works on the live URL

**Progress (2026-11-01):** Every page now fades in when the traveler moves to it: a quick (0.35 second) change in how see-through it is, with no movement. It is plain CSS, so it starts as soon as the page is painted, and it is skipped with "reduce motion" on. The old page does not fade out (as the spec says). Checked on a production build at 375 px: the home page, a destination page, login and photo credits each faded in, and moving back home faded in a fresh page too. Going back home with the page scrolled 2500 px down, the floating navbar stayed 16 px from the top and the scroll-to-top button 24 px from the bottom during the fade. The detail page title still played its own rise inside the page fade. Every page filled the screen, and none scrolled sideways at 375, 768, 1024 or 1440 px. Type-check, lint and `npm run build` pass. Not checked: "reduce motion" (this browser cannot switch it on), and the live URL.
