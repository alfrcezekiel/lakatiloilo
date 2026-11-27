# Page quality (Lighthouse), local production build — 2026-11-27

**Why:** finding 2 of the code review of the 2026-11-26 staging push. Both
Supabase projects are on the free plan, so `NEXT_PUBLIC_SUPABASE_IMAGE_RESIZE`
is `false` and photos load full-size. The team chose to measure **only on
their own computer**, so no hosted quota (Supabase, Vercel) is used.

**Tool:** Lighthouse 13.6.0 ·
**Command:** `npm run perf:lighthouse -- BASE_URL=http://localhost:3000 DEVICES=mobile PAGES=home,login` ·
**Target:** `http://localhost:3000`, a production build (`npm run build` +
`npm start`), on code from `staging` at `1a7ef89` ·
**Run by:** the team · **Pass marks:** unchanged (`budgets.mjs`).

**Checked first:** every active address in `.env.local` and
`backend/.env.local` points at the local Supabase stack (`127.0.0.1:54321`,
database `127.0.0.1:54322`) and the local backend (`localhost:5000`). The old
project's address in `.env.local` is commented out.

## Run 1 (phone)

| Page · phone | Perf. | A11y | Best pr. | SEO | LCP (≤ 2.5 s) | CLS (≤ 0.1) | TBT (≤ 200 ms) | Security |
|---|---|---|---|---|---|---|---|---|
| Home | 98 ✓ | 100 | 100 | 100 | 0.91 s ✓ | 0 ✓ | 159 ms ✓ | ✓ ✓ ✓ |
| Log in | 100 ✓ | 100 | 100 | 100 | 0.91 s ✓ | 0.031 ✓ | 37 ms ✓ | ✓ ✓ ✓ |

Security: CSP enforced with nonces, no CSP violation in the console, and no
request to the backend's address. All budgets met.

- **Home TBT 159 ms** passes, 41 ms under the limit. TBT moves about ±40 ms
  between runs (2026-11-22), so this is still the number to watch. It is
  lower than the live runs on 2026-11-22 (184–201 ms), but local and live
  numbers are not directly comparable.
- Login matches the live run on 2026-11-22 (37 ms TBT, 0.031 CLS).

## Place page, runs 1 and 2 (phone, before the fix)

After `place.mjs` (commit `1efe466`), on `localhost` the runners check the
seed's Mount Talabukon:
`npm run perf:lighthouse -- BASE_URL=http://localhost:3000 DEVICES=mobile PAGES=place`.

| Run | Perf. | A11y | Best pr. | SEO | LCP (≤ 2.5 s) | CLS | TBT (≤ 200 ms) | FCP | Speed Index | Security |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **75 ✗** | 100 | 100 | 100 | **4.08 s ✗** | 0 ✓ | **450 ms ✗** | 0.76 s | 3.22 s | ✓ ✓ ✓ |
| 2 | **75 ✗** | 100 | 100 | 100 | **4.18 s ✗** | 0 ✓ | **434 ms ✗** | 0.87 s | 2.96 s | ✓ ✓ ✓ |

Both runs agree, so it is not noise. No battery warning was printed.

### Cause, from the report

The scripts that kept the phone busy (`bootup-time`), named by building the
same code (`npm run build`, the file names match the team's):

| File | What it is | Size (gzipped) | Busy time |
|---|---|---|---|
| `1akyr7c7-_bcs.js` | **Mapbox map code** (`mapbox-gl`) | 1.9 MB (524 KB) | **1,150 ms**, longest task 242 ms |
| `2olo2e9e-_esu.js` | React | 229 KB (72 KB) | 434 ms |
| `401pjib8mrxa2.js` | Supabase Realtime | 258 KB (67 KB) | 105 ms |

- **The map loaded without anyone scrolling to it.** `PlaceMap.tsx` started
  loading Mapbox once the map was within 400 px of the screen. The seed place
  has one sentence of description and no real photos, so its "Getting there"
  map sits close to the top of a phone screen and loaded straight away. The
  live place on 2026-11-22 had a longer page, so its map stayed out of range
  (TBT 140–149 ms there).
- **TBT:** over a second of the phone running Mapbox's code.
- **LCP:** the main image itself was quick (first byte 47 ms, load delay
  49 ms, download 8 ms, render delay 104 ms), but on the simulated slow 4G
  the 524 KB map download shared the connection with it.
- **It matters for travelers**, not only for seed data: any place with a
  short description and few photos would load the map on a phone before the
  traveler scrolls to it.

### Fix (option 1, team choice 2026-11-27)

`src/components/PlaceMap.tsx` now waits for the page to finish loading (the
browser's `load` event), then loads Mapbox only when the map is actually on
screen (`rootMargin: "0px"`, was `"400px 0px"`). Travelers still see the map
without a click; it can appear a moment after they scroll to it.

Tests: `src/components/PlaceMap.test.tsx` (2 tests). Both fail on the old
code and pass on the new. All 203 Vitest tests, typecheck, lint and
`npm run build` pass.

### After the fix (commit `172d4f8`, checked: `rootMargin: "0px"`)

| Run | Perf. | A11y | Best pr. | SEO | LCP (≤ 2.5 s) | CLS | TBT (≤ 200 ms) | FCP | Speed Index | Security |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | **83 ✗** | 100 | 100 | 100 | **4.54 s ✗** | 0 ✓ | **137 ms ✓** | 0.80 s | 2.00 s | ✓ ✓ ✓ |

- **TBT is fixed:** 434–450 ms → 137 ms. Speed Index 3.0–3.2 s → 2.0 s. The
  team checked in the browser that the map still appears on scrolling to
  "Getting there".
- **LCP is not fixed** (4.08–4.18 s → 4.54 s). So the map download was not
  what slowed it: that part of the cause above was wrong.
- **The LCP element, from the report:** the header's splash art,
  `<img src="/splash-desktop-960x540.webp">` (28 KB). The seed place has no
  saved photo credits, so the backend sends no photo and the splash art
  shows instead (`PlacePhoto.tsx`). Travelers see the same on any place
  whose photo credits are not saved yet.
- **Real versus simulated:** on the team's computer the picture really
  appeared after **716 ms** (observed). Only Lighthouse's simulated slow
  phone on slow 4G says 4.54 s. The picture is found early
  (`lcp-discovery-insight` passes).
- **Render-blocking CSS, about 260 ms of it:** two stylesheets load before
  anything is painted: the site's own styles (`1ionx2_bvuo9x.css`, 16 KB
  gzipped) and **Mapbox's map stylesheet** (`07yialr5jbm3o.css`,
  `mapbox-gl.css`, 5.6 KB gzipped), which `PlaceMap.tsx` imports at the top
  even though the map itself now waits. Too small to explain the other
  ~1.8 s over the limit.
- **What downloads before the picture** (`network-requests`, started before
  the observed 716 ms): **28 requests, 583 KB**. The biggest:

  | Size | Kind | Priority | What |
  |---|---|---|---|
  | 71 KB | Script | Low | React (`2olo2e9e-_esu.js`) |
  | 66 KB | Script | Low | Supabase Realtime (`401pjib8mrxa2.js`), starts at 708 ms |
  | 48 + 45 + 36 KB | Font | **High** | three web fonts (Fraunces, Inter, IBM Plex Mono are loaded in `layout.tsx`) |
  | 46, 29, 26, 24 KB | Script | Low | other Next.js and app code |
  | **28 KB** | **Image** | **High** | **the splash art, the LCP itself** |
  | 17 KB | Document | Very high | the page |
  | 16 KB | Stylesheet | Very high | the site's styles |

- **Cause of the simulated 4.5 s:** the simulated slow 4G moves about 200 KB
  a second, so 583 KB shared between 28 requests takes roughly 3 s before
  the 28 KB picture has finished. The three fonts (129 KB) have the same
  High priority as the picture, so they compete with it directly.
- **Not comparable with the live run:** the live place passed on 2026-11-22
  (LCP 2.15 s) with much the same code. Vercel serves files differently from
  `npm start` on a laptop (its own CDN and compression), which the
  simulation counts. Not confirmed.

### Decision (team, 2026-11-27)

**Accept and park (option 1).** TBT is fixed and the real load is fast
(716 ms). Getting the simulated LCP under 2.5 s would mean cutting about
half of the 583 KB that loads before the picture, which is bigger than MVP
work. Parked in `docs/LATER.md` with the two smaller ideas (fonts, Mapbox
stylesheet).

## Not measured

- **Real photo sizes.** Seed photos are placeholder links that load no
  image, so a local run cannot show the cost of full-size photos. That
  question stays open in `docs/LATER.md` until the team decides how to
  measure it.
- **Run 2 of home and log in.** All values passed with room except home
  TBT (159 ms), so a second run is worth doing.
- **Laptop (desktop) results.** Not run.
