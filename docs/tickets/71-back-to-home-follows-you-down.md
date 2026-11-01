# 71 — Back to Home follows you down

**What to build:** On both detail pages (destinations and accommodations) and their loading skeletons, the glass Back to Home pill stays pinned in the top-left corner of the screen while the traveler scrolls, on a laptop and a phone. Its glass is a little darker, so it stays readable over light photos and over the page's text, and it always sits above the page content. Leaving a place never means scrolling back up.

**Blocked by:** None

**Status:** done (confirmed by the team on the live URL, 2026-11-01)

- [x] On both detail pages, Back to Home starts where it is today and stays in the top-left corner while scrolling to the bottom
- [x] It is readable over the photo, over the About text and over the reviews
- [x] It sits above every part of the page (photo, side panel, tiles, reviews) and never hides behind them
- [x] It does not cover the place's chips or name at the top of the page, on a phone (375 px) or a laptop
- [x] The loading skeleton shows it in the same spot, so nothing jumps
- [x] It still has the keyboard outline from the buttons & cards round
- [x] Works on the live URL

**Progress (2026-11-01):** Back to Home on both detail pages and their loading skeletons is now pinned to the screen ("fixed") instead of to the photo, so it stays in the top-left corner while scrolling. At the top of the page it sits exactly where it was (20 px from the top, 16 px from the left on phones, 24 px on larger screens). Its glass is darker (black tint instead of white), so it stays readable over white text and light photos. It sits above the side panel and below the scroll-to-top button. The "We couldn't find this place" page keeps its normal Back to Home button, because that page does not scroll.

Checked on localhost: on Seda Atria (accommodation) at 1024 px and 375 px, and on Agony Hill (destination) at laptop width, the button stayed at the same spot at every scroll position from top to bottom, and nothing on the page covered it (checked what is on top at its left edge, middle and right edge). On a phone it passed over the address, the About text and the side panel and stayed readable. At the top of the page it is well above the chips and the name. The page does not scroll sideways at 375 px, and the button keeps its keyboard outline. Lint and `npm run build` pass. Not checked: the loading skeleton on screen (it uses the same pinned button), a real phone, and the live URL (not pushed yet).

**Ticked by the team (2026-11-01):** the team ticked the boxes after testing on localhost. "Works on the live URL" stays open until ticket 71 is pushed and checked there.

**Confirmed by the team (2026-11-01):** checked on the live URL and marked done.
