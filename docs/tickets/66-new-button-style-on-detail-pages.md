# 66 — New button style on the detail pages

**What to build:** Both detail pages get one modern button style in three kinds: a solid sunset-amber main button with dark lettering, a glass (see-through white) second button, and a red-outline danger button. Every button is pill-shaped, at least 44 px tall, uses the site's normal font in semibold, sentence case and slightly larger than before, and has a Lucide icon on the left. This ticket sets up the style and uses it for Back to Home on both pages, and for Call (main) and Email the front desk (second) on accommodations.

**Blocked by:** None

**Status:** todo

- [ ] Back to Home on both detail pages, and Call and Email the front desk on accommodations, use the new style, each with an icon
- [ ] The amber main button is easy to read on both the teal (destination) and the blue (accommodation) pages
- [ ] Buttons lift slightly on hover and press in when clicked
- [ ] Moving through the page with the Tab key shows a clear outline on every one of these buttons
- [ ] With "reduce motion" turned on, buttons do not lift or press; they only change colour
- [ ] Looks tidy on a phone (375 px) and a laptop
- [ ] Works on the live URL

**Progress (2026-11-01):** The three button kinds (amber main, glass second, red-outline danger, plus solid red for the "Yes, delete" step) are one shared style next to the existing Button component, so links and buttons can both use it. Back to Home (glass, arrow icon) on both detail pages and their loading skeletons, Call (amber, phone icon) and Email the front desk (glass, mail icon) on accommodations now use it. The danger kinds are ready for ticket 67.

Checked on localhost against the local backend (Hotel del Rio and Agony Hill): every one of these buttons measures 44 px tall, 15 px semibold, pill-shaped, with an icon. Call is amber with dark brown lettering and reads clearly on the blue page. At 375 px, Call and Email are 293 px wide inside the side panel and the page does not scroll sideways; at 1024 and 1440 px they fill the side panel. Back to Home reached by keyboard shows a solid 2 px white outline with a small gap. The lift on hover only exists inside the browser's "no reduced motion" setting. Type-check, lint and `npm run build` pass. Not checked: the press-in by eye, a real phone, the teal page's amber button (destinations have no main button until ticket 67), and the live URL (not pushed yet).
