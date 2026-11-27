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

## Not measured

- **The place page.** It was skipped: its fixed id was a live place that is
  not in `supabase/seed.sql`, so locally it showed "not found". Fixed the
  same day: on `localhost` the runners now check the seed's Mount Talabukon
  (`performance/lighthouse/place.mjs`). Next local run:
  `npm run perf:lighthouse -- BASE_URL=http://localhost:3000 DEVICES=mobile PAGES=place`.
  The place page has a map, so it loads Mapbox tiles (one free map load).
- **Real photo sizes.** Seed photos are placeholder links that load no
  image, so a local run cannot show the cost of full-size photos. That
  question stays open in `docs/LATER.md` until the team decides how to
  measure it.
- **Run 2.** The team rule is two runs before judging speed. All values
  pass with room except home TBT, so a second run is worth doing.
- **Laptop (desktop) results.** Not run.
