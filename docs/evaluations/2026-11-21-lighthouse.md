# Page quality (Lighthouse) and website k6 smoke — 2026-11-21

**Why:** the first L8 run since the security round went live: tickets
151–153 (the browser talks only to the website's `/api`, the backend's
address is hidden) and 156 (enforced Content-Security-Policy with a nonce,
from `db3d37b`). New checks for both were added to the L8 tools (below).

**Tools:** Lighthouse 13.6.0 (`npm run perf:lighthouse`), headless Google
Chrome · k6 2.4.0 (`npm run perf:smoke`, and the new
`perf:site:smoke` on a local production build) · **Lighthouse target:** the
live site, `https://lakat-iloilo.vercel.app` · **Pass marks:** unchanged
(`budgets.mjs`, `thresholds.js`).

## Verdict

**Security: every new check passed, everywhere.** On all 6 page/device
runs the live site enforces its CSP with a nonce, the app's own code
causes no CSP error, and no request goes to the backend's address. Both
k6 smokes passed.

**Speed:** the laptop is fine (Performance 99–100). On a phone the
**TBT budget (≤ 200 ms) was missed on home and the place page, but this
run cannot judge it: the laptop running Lighthouse was on battery** (CPU
score 1,560–1,650, against ~2,970 on the charger). The same thing made
phone TBT 2–3× worse on 2026-11-18 (`2026-11-18-live.md`). **Re-run on
the charger (below):** home TBT fell to 237–325 ms (still a little over),
place TBT passed in 2 of 3 runs, and the place page's LCP (2.6–3.4 s) is
the one real open ✗.

## Lighthouse, phone (on battery, two runs of home and place)

| Page | Perf. | A11y | Best pr. | SEO | LCP (≤ 2.5 s) | CLS (≤ 0.1) | TBT (≤ 200 ms) |
|---|---|---|---|---|---|---|---|
| Home | 77 / 82 ✗ | 100 | 100 | 100 | 0.96 / 1.18 s ✓ | 0.001 ✓ | 841 / 675 ms ✗ |
| Place | 81 / 89 ✗ | 100 | 100 | 100 | 3.40 ✗ / 2.01 ✓ s | 0 ✓ | 431 / 403 ms ✗ |
| Log in | 99 | 100 | 100 | 100 | 0.95 s ✓ | 0 ✓ | 95 ms ✓ |

## Lighthouse, laptop

| Page | Perf. | A11y | Best pr. | SEO | LCP | CLS | TBT |
|---|---|---|---|---|---|---|---|
| Home | 99 | 100 | **77 ✗** | 100 | 0.33 s ✓ | 0 ✓ | 70 ms ✓ |
| Place | 100 | 100 | 100 | 100 | 0.70 s ✓ | 0 ✓ | 1 ms ✓ |
| Log in | 100 | 100 | 100 | 100 | 0.29 s ✓ | 0.007 ✓ | 0 ms ✓ |

## Security checks (new, every page and device)

| Check | How Lighthouse sees it | Result |
|---|---|---|
| CSP enforced, scripts need a nonce | the `csp-xss` audit reads the real header; fails on "No CSP found in enforcement mode", `'unsafe-inline'` scripts, no `object-src` / `script-src` / `base-uri`, or a short nonce | ✓ 6 / 6 |
| No CSP violation in the console | no "Content Security Policy" error in `errors-in-console` | ✓ 6 / 6 |
| No request to the backend's address | no `localhost:5000`, `127.0.0.1:5000` or `api-lakat-iloilo` in `network-requests` | ✓ 6 / 6 |

Lighthouse still rates "Host allowlists can frequently be bypassed" as
High, because the policy lists `'self'` next to the nonce and uses no
`'strict-dynamic'`. That is a hardening idea, not a hole: an injected
script still needs the nonce. It is not counted as a fail.

**Proved able to fail:** against a pretend page with a report-only
policy and a `fetch` to `localhost:5000`, the CSP and backend checks
turned ✗. Against a page whose enforced policy blocks one of its own
scripts, the console check turned ✗.

## What caused each ✗

1. **Phone TBT, home and place.** Most of the busy time is one script,
   the React and Next.js framework chunk (`04an_cothcjox.js`, 230 KB): about
   1.3 s of script work on home, with one 635 ms long task, while React
   brings the page to life (hydration). That work happens in the phone's
   browser, and Lighthouse imitates a phone by slowing **this laptop's**
   CPU 4×. On battery the laptop runs at ~1.7 GHz, so the "phone" is
   about twice as slow as a real mid-range phone. Not judged today. The
   runner now **prints a warning** when the CPU score is under 2,000.
2. **Place LCP 3.4 s on the first run, 2.0 s on the second.** The usual
   variation between runs (the LCP is the place photo). Not a regression.
3. **Best Practices 77 on home (laptop): "Uses third-party cookies".**
   Wikimedia sets cookies on its photos. **Not ours to fix**, as on
   2026-11-18.

## k6 smokes (localhost, 1 traveler)

| Test | Target | p(95) | Errors | Checks | Result |
|---|---|---|---|---|---|
| `perf:smoke` (backend direct) | `localhost:5000` | 791 ms | 0 % | 26 / 26 | ✓ (close to the 800 ms line) |
| `site-smoke.js`, first try | production build, `localhost:3001` | pages **849 ms ✗**, `/api` 310 ms | 0 % | 92 / 92 | ✗ |
| `site-smoke.js`, after the warm-up | the same | pages 703 ms ✓, `/api` 337 ms ✓ | 0 % | 96 / 96 (security 100 %) | ✓ |

**The first ✗ and its fix:** the home page takes 0.30 s each time, except
its **first visit after the website starts** (0.85 s, cold caches). A
40-second smoke makes only about 9 page visits, so that one visit decided
p(95) on its own. `setup()` now opens each page once before the
travelers start, and the speed limits only count the travelers' own
requests. The limit is still 800 ms. The cold first visit is real: right
after a deploy, the first traveler waits about 0.85 s for home.

**Proved able to fail:** against a pretend site with a report-only
policy, a fixed nonce, `'unsafe-inline'`, `X-Powered-By`, an open CORS
header and the backend's address in its answers, all 8 security checks
failed, and k6 exited with a failure code.

## Re-run on the charger (same day)

Laptop plugged in (CPU ~4 GHz, Lighthouse CPU score 2,630–2,770), live
site, phone, two runs (a third for the place page):

| Page · phone | Perf. | LCP (≤ 2.5 s) | TBT (≤ 200 ms) | On battery (earlier today) |
|---|---|---|---|---|
| Home | 89 / 95 | 1.07 / 1.07 s ✓ | **325 / 237 ms ✗** | 77 / 82 · TBT 841 / 675 ms |
| Place | 95 / 81 / 90 | **2.60 / 3.36 / 3.22 s ✗** | 147 ✓ / 423 ✗ / 182 ✓ ms | 81 / 89 · TBT 431 / 403 ms |

- **The battery explained most of the TBT.** Home went from 675–841 ms to
  237–325 ms, close to the 263–288 ms measured on the charger on
  2026-11-18. It is still a little over 200 ms: React bringing the page to
  life (the framework script, `04an_cothcjox.js`). Not a regression;
  making home lighter would be its own ticket.
- **Place page TBT passes in 2 of 3 runs** (147 and 182 ms). The 423 ms
  run is run-to-run noise.
- **Place page LCP is over 2.5 s in all 3 runs** (2.6–3.4 s; it was
  1.85–2.22 s on 2026-11-18). The LCP is the header's splash photo
  (`splash-desktop-960x540.webp`, 28 KB). On the real, unslowed page load
  it is ready in about 0.76 s (first byte 43 ms, load delay 263 ms,
  download 71 ms, render delay 382 ms). The 2.6–3.4 s is Lighthouse's
  *simulation* of slow 4G.
- **Tried: `fetchpriority="high"` on the hero photo**
  (`src/components/PlacePhoto.tsx`, test in `PlacePhoto.test.tsx`, which
  failed before the change and passes after). Lighthouse had flagged it
  ("LCP request discovery", score 0). After: that check passes (score 1)
  and the photo starts downloading sooner (load delay 130 ms). But on a
  fair before/after, the same local production build on port 3001 with
  and without the change, LCP was **3.71 / 3.72 s before and 3.81 / 3.77 s
  after**: no measurable change. (Local LCP is higher than live because
  the local website's backend calls reach the database in Mumbai.) So
  this is good practice, **not the fix** for the place LCP ✗. Its real
  cause is still open. Stopped here, as the team rule asks after two
  tries.

## Place page LCP: what is known (same day, after the team's runs)

The team re-ran Lighthouse on the charger: place LCP 2.75 s ✗, TBT 111 ms
✓, Performance 95; home LCP 1.12 s ✓, TBT 284 ms ✗.

- **On a real slowed-down phone it passes.** The same live page with
  Lighthouse's *real* throttling (`throttlingMethod: "devtools"`: Chrome
  really slows the network and CPU) gave **LCP 1.96 s ✓**. The ✗ (2.6–3.4
  s) comes from the default *simulated* throttling, which is what the
  budget uses. Both are Lighthouse's own methods; the budget stays on the
  default.
- **What the simulation sees:** the header photo is downloaded at **Low**
  priority, after all 18 scripts (340 KB) have started. On the
  simulated 1.6 Mbit/s connection it waits for them.
- **Ruled out (try 3): the loading skeleton.** The page streams: a
  skeleton first (`loading.tsx`), then the real header, whose `<img>`
  arrives after 21 script tags. Same local production build, two runs
  each: **with the skeleton 3.78 / 3.77 s, without it 4.08 / 4.07 s**. So
  the skeleton does not cause it, and removing it makes LCP a little
  worse. Put back unchanged.
- Already ruled out: the photo's size (2026-11-18) and its priority hint
  (`fetchpriority`, above).
- **Stopped here** after three tries. Ideas not tried: the hero `<img>` is
  placed among the page's scripts by Next.js's streaming, so a
  `<link rel="preload">` in the `<head>` for the splash art might let the
  browser start it first. That changes how every place page loads, so it
  is the team's decision, as its own ticket.

## Not checked
- `perf:site:load` (20 travelers, 7 minutes). It reaches the hosted
  database, so the team starts it.
- The website smoke on the live URL: the team runs it with
  `k6 run -e SITE_URL=https://lakat-iloilo.vercel.app performance/k6/scenarios/site-smoke.js`.
