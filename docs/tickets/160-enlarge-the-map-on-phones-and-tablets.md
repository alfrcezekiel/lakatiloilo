# 160 — Enlarge the map on phones and tablets

**What to build:** On screens narrower than 1024 px (tablets and
phones; checked at 768, 425, 375 and 320 px), the place map can be enlarged to fill the
whole screen and closed again. While enlarged, one finger moves the map
and pinching zooms it; in the page, the map keeps today's behaviour (one
finger scrolls the page, two fingers move the map), so the page never gets
stuck on the map. Laptops (from 1024 px) keep the map as it is.

**Blocked by:** none (builds on 159, which is waiting for the team's check)

**Status:** done (the team confirmed it works on the live site, 2026-11-22)

- [x] At 768, 425, 375 and 320 px an **Enlarge map** button shows under the
      map and as a round button on the map; at 1024 px and wider it does not
- [x] Enlarged, the map fills the screen (no page behind it scrolls), with
      every control usable: route panel, Car / Walk, ✕, layers, Traffic and
      legend, zoom, recenter
- [x] Enlarged: one finger moves the map, pinch zooms; the page: one finger
      scrolls the page, two fingers move the map (as now)
- [x] **Close** (the same round button, now "Make the map smaller") and the
      Escape key bring the map back to its place on the page, at the same
      scroll position, with the route, traffic and layer kept
- [x] The live route keeps running while the map is enlarged or closed
- [x] Nothing scrolls sideways; every button at least 44 × 44 px; the
      keyboard focus moves into the enlarged map and back to the button
- [x] Works on a real phone and tablet on the live URL

**Why (plain English):** On a laptop the mouse can scroll the page past the
map and Ctrl + scroll zooms it. On a phone the same map is a small window
in a long page, and one finger scrolls the page instead of the map, so
following a route on the go is hard. A full-screen map is how travelers
expect maps to work on a phone.

**Notes:** no new library or service: Mapbox GL's own
`setCooperativeGestures` and `resize`, and CSS for the full-screen view.

**Progress (2026-11-22):** built; the team confirmed every box on the
live site the same day.

- Checked in headless Chrome with phone/tablet emulation (touch on) at
  1024, 768, 425, 375 and 320 px, on Dinagyang Festival with a live route
  on: the buttons show only below 1024 px; enlarged, the map fills the
  screen exactly, the page behind is locked, nothing scrolls sideways,
  every one of our buttons is at least 44 px (Mapbox's ⓘ is smaller), the
  route stays on; Escape closes it at the same scroll position and the
  focus returns to Enlarge map.
- One-finger drag (sent as real touch events): in the page the map does
  not move; enlarged it does.
- Root cause found on the way: Mapbox's `setCooperativeGestures` only
  changes a setting; the touch classes (`touch-action: pan-x pan-y`) are
  set when its drag handler is switched on. So the map now switches
  `dragPan` off and on around it. Checked: enlarged `touch-action: none`,
  back in the page `pan-x pan-y`.
- Known small side effect: after the first enlarge, Mapbox no longer
  shows its "Use two fingers to move the map" reminder in the page (the
  two-finger behaviour itself still works).
- The map's place in the page keeps its height while enlarged, so the
  page under it never moves.
- At 320 × 640 the Enlarge button can sit partly below the screen edge;
  tapping it scrolls the page a few pixels first, as any button would.
- `npx tsc --noEmit`, `npx eslint src`, 119 unit tests and `npm run build`
  pass.
- **Not checked:** a real phone and tablet (iOS Safari and Android
  Chrome), and the live URL.

**Fix (2026-11-22, team request after the live check):** on a phone the
place's popup, opened when the map loads, sat under the "Route from my
location" panel and hid its ✕. Two causes: the popup and panel overlapped
on narrow maps, and Mapbox flipped a tall popup (an accommodation's
two-line name) below the pin, over the layer buttons. Now the popup is
always above its pin (`anchor: "bottom"`), and once the panel is on screen
the map slides down by exactly the overlap. Checked at 320, 375, 425,
768, 1024 and 1440 px on a destination and an accommodation: the popup
stays inside the map, clear of the panel and the layer buttons, ✕
reachable.
