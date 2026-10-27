# 48 — Home page loads places on the server

**What to build:** When a traveler opens the home page, the Next.js server asks the NestJS backend for the destinations and accommodations before sending the page, the same way the detail pages already work. Travelers see the same home page as before; on a phone it arrives with places already in it.

**Blocked by:** None

**Status:** done (tested by the team on the live URL, 2026-10-27)

- [x] The browser no longer asks the backend's place endpoints for the home page (checked in the browser's Network tab)
- [x] The hero, About and Features show straight away; the place sections and the Featured and Trending cards show skeletons until the places arrive, with no layout jump
- [x] With the backend unreachable, "We couldn't load places" shows
- [x] Search suggestions, category chips and the City/Province filters work as before
- [x] Works on the live URL

**Checked on localhost (2026-10-25):** the browser made no requests to the backend; all 34 place cards and the Featured and Trending cards showed; typing "din" in Where to? suggested Dinagyang Festival; the page sent by the server starts with the skeletons ("Loading places") and carries the places as they arrive. The team then checked it with the browser throttled to 3G: the skeletons showed first, then the real places. With the backend stopped, the home page showed "We couldn't load places", and the places came back after restarting it.

