# 61 — Animations on the home page and phone menu

**What to build:** The home page moves too: its text and cards (hero text, search bar, chips, Featured and Trending cards, Why Iloilo, Features cards, category cards, list headings and place cards) rise in on page load if on screen, fade up while scrolling down and fade down while scrolling up, every time they come back on screen, and cards lift slightly when hovered. On phones, the navbar menu slides open and closed instead of appearing at once. "Reduce motion" turns all of it off.

**Blocked by:** 60

**Status:** in progress

- [x] Text and cards rise in on page load or refresh, fade up while scrolling down and fade down while scrolling up, every time
- [ ] Cards lift slightly on hover on a laptop
- [ ] The phone navbar menu slides open and closed, and Escape or the close button still closes it
- [ ] Clicking a category card still scrolls to its section, and search suggestions still work
- [ ] With "reduce motion" turned on, nothing slides, fades or lifts
- [ ] Works on the live URL

**Change (2026-11-01, team request):** the team asked for the animations to be clearly visible: text and cards on screen rise in when the page loads or is refreshed, rise up while scrolling down, come down from above while scrolling back up, and do this every time they return to the screen (they fade out when they leave), instead of once. The same shared fade (Reveal) is used on the home page and the detail pages.

**Progress (2026-11-01):** Done so far: the scroll and page-load animations for the home page's text and cards (the first box). Cards in one row arrive one after another. Not started: the hover lift and the sliding phone menu. Checked on a production build at 375 px: on load, the 53 text blocks and cards below the screen were hidden, ready to animate, while those on screen played the load fade; scrolling down to Features made its heading rise in and end fully visible; no sideways scrolling. Not checked: the fade-down direction when scrolling up (the browser pane was drawing only 2 frames a second, so it could not be timed), "reduce motion", and the live URL. Type-check, lint and `npm run build` pass.

**Checked by the team on localhost (2026-11-01):** the page-load and scroll animations (fade up, fade down, every time) look good.

**Progress (2026-11-01, rest of the ticket):** Every card (Featured and Trending, category cards, place cards) now lifts 4px with a deeper shadow on hover, on devices with a mouse and not with "reduce motion" on. The place cards used to grow 5% on hover instead; they now lift like the others, as the spec says. The phone menu's dark backdrop fades in and its panel slides in from the right, and both go out the same way when it closes. The menu did not close with the Escape key before; now it does. Checked on a production build: at 375 px the menu slid in (caught part-way) and ended in place; Escape and the close button each closed it, with the panel staying for the slide out and the navbar coming back; tapping "Mountains & Hiking Spots" scrolled exactly to its list; typing "din" suggested Dinagyang Festival; no sideways scrolling. At 1440 px, hovering a place card lifted it 4px. Type-check, lint and `npm run build` pass. Not checked: "reduce motion", and the live URL.
