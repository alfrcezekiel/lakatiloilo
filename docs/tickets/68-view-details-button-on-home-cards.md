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
