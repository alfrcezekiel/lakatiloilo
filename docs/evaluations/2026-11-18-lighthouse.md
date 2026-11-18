# Page quality (Lighthouse) — 2026-11-18

**Tool:** Lighthouse 13.6.0 (`npm run perf:lighthouse`), headless Google
Chrome · **Target:** the live site, `https://lakat-iloilo.vercel.app` (the
last push; not yet with the unpushed fixes) · **Pages:** home, a place
(Breakthrough Restaurant), log in · **Devices:** phone (Lighthouse
"mobile": mid-range phone, slow 4G) and laptop ("desktop") · **Pass marks:**
Google's "good" limits (`performance/lighthouse/budgets.mjs`)

## Verdict

**Accessibility is 100 on every page and device. On a laptop the site is
fast. On a phone, the home page is slow** to show its main content, and
it is the one thing worth fixing before the demo. 6 budgets missed in
all: 4 on home (phone), 1 on the place page (phone), 1 on home (laptop).

## Scores and Core Web Vitals

| Page · device | Perf. | A11y | Best pr. | SEO | LCP (≤ 2.5 s) | CLS (≤ 0.1) | TBT (≤ 200 ms) |
|---|---|---|---|---|---|---|---|
| **Home · phone** | **62 ✗** | 100 | **77 ✗** | 100 | **6.5 s ✗** | 0 ✓ | **450 ms ✗** |
| Place · phone | 90 | 100 | 100 | 91 | **3.3 s ✗** | 0 ✓ | 146 ms ✓ |
| Log in · phone | 100 | 100 | 100 | 100 | 0.9 s ✓ | 0 ✓ | 36 ms ✓ |
| Home · laptop | 98 | 100 | **77 ✗** | 100 | 1.1 s ✓ | 0 ✓ | 6 ms ✓ |
| Place · laptop | 100 | 100 | 100 | 91 | 0.7 s ✓ | 0 ✓ | 0 ms ✓ |
| Log in · laptop | 100 | 100 | 100 | 100 | 0.3 s ✓ | 0 ✓ | 0 ms ✓ |

- **CLS is 0 everywhere:** nothing jumps while the pages load.
- First content appears quickly everywhere (FCP 0.3–1.1 s). The problem is
  the *main* content on a phone.

## Causes (from the HTML reports)

1. **Home, phone: LCP 6.5 s, TBT 450 ms.** The largest thing on screen
   is the **intro paragraph under the hero heading**
   (`<p class="mb-10 max-w-2xl …">`), not a photo. It arrives quickly
   (first byte 134 ms), but is only counted as shown after a **2.5 s
   "render delay"**. Likely reason: it **fades in** (it starts invisible),
   and on a slow phone the main thread is busy for **3.2 s** (scripts
   1.0 s, style and layout 0.7 s), so the fade can't finish sooner. Not
   yet proven by a change.
2. **Photos much bigger than shown (home): about 3.2 MB could be saved.**
   For example, a place photo of 949 KB from Supabase Storage, and
   Wikimedia photos of 810 KB and 510 KB. The site uses a plain `<img>` on
   purpose, to save Vercel's image-optimisation quota (the ESLint rule
   `no-img-element` is off), so photos arrive at full size.
3. **Place page, phone: LCP 3.3 s.** The main content is the **1920×1080
   desktop splash image** (`/splash-desktop-1920x1080.webp`), used on
   phones too. The browser only starts loading it after about 1.1 s
   ("resource load delay"). Mobile splash images exist in `public/`, but
   are not used on this page (and are not committed yet).
4. **Best practices 77 on home (phone and laptop): third-party cookies.**
   Wikimedia sets `WMF-Uniq` and `NetworkProbeLimit` cookies when its
   photos load. These are set by Wikimedia, not by this site's code.
5. **SEO 91 on place pages: no meta description.** Place pages have a
   title but no `<meta name="description">`, so search results show
   random text.
6. Smaller: 119 KB of unused JavaScript and 14 KB of legacy JavaScript
   on home.

## What to fix (not done; each is a team decision)

| # | Fix | Helps | Size |
|---|---|---|---|
| 1 | ~~Show the home hero text without fading in~~ **Done**, plus no whole-page fade on the first page (see Fixes) | Home LCP on phones | small |
| 2 | ~~Add a meta description to place pages~~ **Done**, with metadata in the `<head>` (SEO 100) | SEO → 100 | small |
| 3 | ~~Smaller splash on phones; load it early~~ Tried both (see Fixes 3): smaller kept, priority reverted, LCP unchanged | Place LCP on phones | small |
| 4 | Ask for smaller photos: Wikimedia thumbnails can be requested at a width (for example 800 px); resize place photos when uploading | Home LCP, data use | medium |
| 5 | Host the Wikimedia photos ourselves (Supabase Storage) | Best Practices → 100 | medium (credits must stay, see `docs/PHOTO-CREDITS.md`) |

## Fixes, 2026-11-18 (local production build, not pushed yet)

Measured with `npm run build` + `npm start` on port 3005, phone setting,
two runs before and two after each change.

### 1. Home page's main content: 8 s → 0.9 s on a phone ✅

**Root cause (measured, not guessed):** two fades that start invisible.
- The **whole page** fades in from invisible on every load
  (`animate-page-fade` in `src/app/template.tsx`, made for moving
  between pages).
- The **hero text** also fades in from invisible (`Reveal`).

The browser only counts text as shown once it is visible, and Lighthouse's
slow-phone *simulation* then counted all the JavaScript that ran before
that moment as delaying it. In Chrome slowed down 4×: with the page fade
switched off, LCP fell from ~1.3 s to ~0.2 s. With the page fade off but
the hero still fading from invisible, it was back to ~1.3 s, so both had
to change. (A first theory, a "second fade" in `Reveal` on slow phones,
was disproved by the same trace.)

**The fix:**
- `template.tsx`: no page fade on the **first** page of a visit. Every
  page after that still fades in (checked: home → place → back home).
- The hero's label, heading and intro now **rise without starting
  invisible** (`Reveal visibleFromStart` → new `animate-rise-up` in
  `globals.css`). It is the same motion and timing. Everything else on the
  site keeps its fade.

| Home · phone | Before (2 runs) | After (2 runs) |
|---|---|---|
| Performance | 67, 70 | **97, 96** |
| LCP | 8.2 s, 8.0 s | **0.91 s, 0.90 s** |
| TBT | 362, 267 ms | 187, 217 ms (at the 200 ms line) |
| CLS | 0 | 0.001 |

No hydration warnings in the console; 76 Vitest and 59 Playwright tests
pass.

### 2. Place pages' meta description: SEO 91 → 100 ✅

`generateMetadata` on destination and accommodation pages now returns a
`description`, built from the place's own text by `metaDescription()`
(`src/lib/meta-description.ts`, 5 unit tests): spaces tidied, cut at a
whole word to about 155 characters. A place with no text gets a sentence
naming it. It is in the HTML, for example "A seafood restaurant along the
coast famous for its fresh oysters…".

**At first, Lighthouse still said "no meta description" (SEO 91).** Next.js 16
streams page metadata in after the `<head>` so it never delays the page,
and it does this even for Googlebot, which runs JavaScript and reads it.
Lighthouse's SEO check only looks inside `<head>`.

**Team decision (2026-11-18): metadata in the `<head>` for everyone**,
with `htmlLimitedBots: /.*/` in `next.config.ts`. Checked: titles and
descriptions are now in the `<head>` on home, destination and accommodation
pages. **SEO is 100 on place pages** (2 runs). Speed is unchanged (home
95–97, place 85–86 on a phone), because a place page's metadata comes from
the same cached backend answer the page needs anyway.

### 3. Place page on a phone (LCP ~4.1 s): two tries, not fixed

The team's run on 2026-11-18 checked the **live** site, which does not
have the fixes above yet, so its home (LCP 6.5 s) and SEO 91 results are
the old code. What is still open, measured locally:

| Place page · phone | LCP | Performance |
|---|---|---|
| With fixes 1 and 2 | 4.16 s | 85–86 |
| Try 1: `fetchPriority="high"` on the hero image | 4.96 s (worse) | 81 → **reverted** |
| Try 2: half-size splash for phones (`srcSet`) | 4.14 s (no change) | 83–86 → **kept** |

- **Try 1** worked in the browser: the image's "load delay" fell from
  ~1,077 ms to 140 ms. But in Lighthouse's slow-4G simulation, fetching
  the image first delayed the page's scripts, so LCP got worse. Removed.
- **Try 2** made `public/splash-desktop-960x540.webp`: the same art at
  960 × 540, **27 KB instead of 251 KB**, made with `sharp`, and checked
  by eye. The browser now picks it on phones and the full size on laptops
  (checked: the phone downloaded the 960 copy, the laptop the 1920 one).
  It saves data for real visitors, but **did not move the simulated
  LCP**, so the image's size is not the bottleneck.
- **Likely cause (not proven):** the place page streams. `loading.tsx`
  sends a skeleton first, and the real page, with the image, follows after
  the server has fetched the place from the backend. The slow-phone
  simulation stretches that wait. Changing it is a design decision.
  Stopped here, after two tries, as the team rule asks.

### Still open
- Place page, phone: LCP 4.1 s (see 3 above: not the image).
- Photos 3.2 MB bigger than needed (fix 4), and Wikimedia's cookies
  (fix 5).

## What was checked, and what was NOT checked

- **Checked:** 3 pages × 2 devices on the live site, one run each, plus a
  laptop-only re-run to check the runner (same result).
- **Not checked:** real visitors' numbers (field data, which needs many
  visits; Vercel Speed Insights could collect it), pages behind a login,
  and the admin dashboard. Performance moves a few points between runs:
  confirm with a second run before and after any fix.
- **Not yet on the live site:** the unpushed fixes (the review jiggle, the
  open redirect, the 20-connection pool). Re-run after the push.
