# 68 — "View details" button on home cards

**What to build:** Every destination and accommodation card in the home page's list sections gets an amber **View details →** button at the bottom, in the main style from ticket 66. The whole card stays clickable; the button just makes that obvious. The Featured and Trending cards' "View details" links get the same look.

**Blocked by:** 66

**Status:** done (confirmed by the team on the live URL, 2026-11-01)

- [x] Every card in the six destination sections and in Accommodations shows "View details →" at the bottom
- [x] Clicking the button, or anywhere else on the card, opens that place's detail page
- [x] The Featured and Trending "View details" links have the same look
- [x] Moving with the Tab key stops once per card (not twice), with a clear outline
- [x] Cards in one row keep the same height, with the button lined up at the bottom
- [x] Looks tidy on a phone (375 px) and a laptop
- [x] Works on the live URL

**Progress (2026-11-01):** Every destination and accommodation card on the home page, and the Featured and Trending cards, end with an amber "View details →" pill (the main button style from ticket 66). It only looks like a button: it sits inside the card's existing link, because a link inside a link is not allowed and would make keyboard users stop twice per card. Each card is now a column with the pill pushed to the bottom, so the pills line up across a row. The card link shows a white outline around the whole card when reached with the Tab key. The loading skeletons gained a grey pill of the same size, so nothing jumps when places arrive. The hotel/condominium tag keeps its small size in the new column layout.

Checked on localhost against the local backend: all 34 home cards have the pill, 44 px tall; in every list card it sits the same distance (25 px) from the card's bottom, and cards in a row are the same height (416 px at 1024 px). At 375, 768, 1024 and 1440 px every pill is inside its card and the page does not scroll sideways. With the Tab key, focus goes from one card straight to the next, with a solid 2 px white outline. Lint and `npm run build` pass. Not checked: the skeletons on screen (the home page arrives already filled from the server; their pill matches the real one by its classes), a real phone, and the live URL (not pushed yet).

**Ticked by the team (2026-11-01):** the team ticked the boxes after testing on localhost. "Works on the live URL" stays open until ticket 68 is pushed and checked there.

**Confirmed by the team (2026-11-01):** checked on the live URL and marked done.

**Fixed (2026-11-01, found by the team):** hovering a destination or accommodation card, or its "View details" button, showed a dark haze around the card and a yellow glow under the button. Root cause: three shadows meant for solid surfaces were drawn around see-through glass cards: the card grew a large shadow on hover (from the polish round), the Card building block adds a small shadow even at rest, and the amber main button has its own soft amber glow. The list cards and their "View details" pill now have no shadow; the card still lifts slightly on hover, and the amber buttons on the detail pages keep their glow. Checked on localhost by hovering Seda Atria's button with the mouse: both the card and the pill measure no shadow, and the card still moves up 4 px. Type-check, lint and `npm run build` pass. Not checked: the live URL (not pushed yet).

**Fix confirmed by the team (2026-11-01):** the hover shadow is gone on the live URL.

**Fixed again (2026-11-01, found by the team with screenshots):** hovering the Featured and Trending cards showed a light, white-looking band (for example down the right side of the Dinagyang card), and the list cards could show the same band (for example down the left of a Foods & Dine-ins card). Root cause: the cards used a frosted-glass blur (backdrop-blur) while they also animate (fade in, lift on hover); the browser then paints the blur in pieces, and the joins show as light bands. The first fix only removed the shadows, so the band came back. Now the place cards (the six destination lists, Accommodations, Featured and Trending) and their loading skeletons have no backdrop blur. The Featured and Trending cards also lose their large shadow and the whiter background on hover, like the list cards. The cards still lift slightly on hover; the background behind them is a smooth gradient, so they look almost the same without the blur. Checked on localhost: all 34 place cards measure no blur and no shadow; hovering the Trending card left its background unchanged, and a screenshot of both Featured cards while hovering showed no band. Lint and `npm run build` pass. Not checked: the live URL (not pushed yet).

**Fix confirmed by the team (2026-11-01):** after a hard refresh on localhost, hovering the cards shows no band.
