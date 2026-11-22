# 159 — Live traffic and live route on the place map

**What to build:** On the destination and accommodation pages, the map
gets a **Traffic** layer that shows live road congestion, and the route
from the traveler's location to the place becomes **live**: while the
route is on, the traveler's blue pin follows them and the route, time and
distance update as they move, until they arrive or press ✕. The place's
pin is dark teal green and the traveler's pin is blue. The place's
position is the latitude and longitude saved in the `destinations` or
`accommodations` table.

**Blocked by:** none (the map and the one-time route preview from the
glass detail pages round, 2026-11-22, are in place but not committed)

**Status:** done (the team confirmed it works on the live site, 2026-11-22)

- [x] Map layers: Satellite, Satellite Streets and Streets buttons; when
      Mapbox refuses satellite tiles (the current account: 429, no
      allowance), the map shows Streets and says why
- [x] A **Traffic** button turns live traffic on and off: roads coloured
      green (low), amber (moderate), orange (heavy) and red (severe), with
      a small legend; it stays on when the traveler switches layers
- [x] **Route from my location** asks for the location only when pressed,
      then keeps following the traveler: the blue pin moves with them, and
      the route, time and distance are fetched again when they have moved
      about 40 m, at most every 15 seconds
- [x] The status says it is live ("Live · 12 min · 3.8 km by car"), and
      "You've arrived" within about 50 m of the place, which stops the
      tracking
- [x] ✕ (Clear the route) and leaving the page stop the tracking: the
      browser stops reading the location
- [x] Traveler's pin blue; the place's pin dark teal green, on both kinds
      of page
- [x] Friendly messages when location is blocked, off or slow, or there is
      no route; Get directions (Google Maps) still works
- [x] The line under the map says the location is shared with Mapbox only
      while the route is on, and Lakat Iloilo doesn't save it
- [x] Looks right at 375, 768, 1024 and 1440 px; nothing scrolls sideways
- [x] Works on the live URL, on a phone, walking or riding a short way

**Why (plain English):** Travelers want to see how to get to the place
from where they are, how busy the roads are now, and to keep seeing their
progress on the way, without leaving Lakat Iloilo for Google Maps.

**Notes:**

- Mapbox is outside the pinned stack; the team added it in the glass
  detail pages round. Traffic uses Mapbox's `mapbox-traffic-v1` tiles and
  the route uses Mapbox Directions, both on the same public token
  (`NEXT_PUBLIC_MAPBOX_TOKEN`). Checked 2026-11-22: traffic tiles 200
  (600 per minute), Directions 200 (300 per minute), satellite 429 with
  no allowance (only the Mapbox account owner can change that).
- Re-fetching at most every 15 seconds keeps one traveler at 4 route
  requests a minute or fewer.
- The location never reaches our backend and is never saved.

**Progress (2026-11-22):** built; the team confirmed every box on the
live site the same day.

- Checked in headless Chrome with a pretend location (never a real
  person's), on Dinagyang Festival and on Courtyard by Marriott Iloilo:
  first route 12 min · 3.8 km by car; after moving about 1.2 km and
  waiting past 15 s, the route updated to 8 min · 2.4 km (2 Directions
  requests, both 200); moving to within 50 m showed "You've arrived".
  Traffic tiles 200. Pins: place #115e59, traveler #2563eb.
- 320, 375, 768, 1024, 1280 and 1440 px: nothing scrolls sideways, both
  pins sit clear of the panels after the zoom to the route, every button
  of ours is at least 44 px (Mapbox's own ⓘ credits button is smaller).
- Root cause found on the way: Mapbox's "style loaded" check also waits
  for every tile, so while the map moved it said "no" and the traffic
  layer (and live route updates) were skipped. The map now tracks the
  "style.load" moment itself.
- `npx tsc --noEmit`, `npx eslint src`, 119 unit tests (11 for the route
  helpers, src/lib/map-route.test.ts) and `npm run build` pass.
- **Not checked:** a real phone moving outdoors, the live URL, and
  satellite (still refused by the Mapbox account: 429, no allowance).

**Progress (2026-11-22, later):** the team switched `NEXT_PUBLIC_MAPBOX_TOKEN`
in `.env.local` to a public token from another Mapbox account. Checked
with curl (token not printed): satellite tiles 200 (100,000 a minute),
streets and traffic 200, Directions 200. In headless Chrome on localhost,
Satellite Streets shows first, Satellite and Streets switch, 12 satellite
tiles all 200, and the "Satellite view isn't available" note no longer
shows. No code change: the map brings satellite back by itself.
**Still to do by the team:** put the same token in Vercel (Production and
Preview) and redeploy, or the live site keeps the old, blocked one.
