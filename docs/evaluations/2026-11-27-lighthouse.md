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

### After the fix

Not measured yet. **Next:** the team runs the same place command twice, on
their own computer, and the results go here.

## Not measured

- **Real photo sizes.** Seed photos are placeholder links that load no
  image, so a local run cannot show the cost of full-size photos. That
  question stays open in `docs/LATER.md` until the team decides how to
  measure it.
- **Run 2 of home and log in.** All values passed with room except home
  TBT (159 ms), so a second run is worth doing.
- **Laptop (desktop) results.** Not run.
