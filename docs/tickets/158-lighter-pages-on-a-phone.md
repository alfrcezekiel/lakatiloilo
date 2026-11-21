# 158 — Lighter pages on a phone

**What to build:** Make the home page and the place page send and run
less JavaScript on a phone, so both meet Lighthouse's phone budgets:
home TBT ≤ 200 ms and place page LCP ≤ 2.5 s. Nothing a traveler sees
or can do changes.

**Blocked by:** none (157 is done)

**Status:** in progress (built and measured locally, not pushed)

- [ ] Measured first: what is in each script chunk on home and on a place
      page, and its size (written in the progress note below)
- [ ] Home: TBT ≤ 200 ms on a phone in 2 Lighthouse runs out of 2, on the
      charger (`npm run perf:lighthouse:mobile`, no `⚠ CPU score` line)
- [ ] Place page: LCP ≤ 2.5 s on a phone in 2 runs out of 2, on the charger
- [ ] Performance stays ≥ 90, and Accessibility, Best Practices and SEO
      stay at 100, on phone and laptop
- [ ] The 9 Lighthouse security checks still pass (enforced CSP with a
      nonce, no CSP errors, no request to the backend's address)
- [ ] `npm run perf:site:smoke` passes (every security check 100 %)
- [ ] Everything on home still works: search, category chips, Featured and
      Trending, the lists and their paging, live updates, the navbar and
      its dropdown, Scroll to top, the fades
- [ ] Everything on a place page still works: the photo gallery, reviews
      (write, edit, delete, like, reply), live updates, the back link
- [ ] Looks the same at 375, 768, 1024 and 1440 px
- [ ] Works on the live URL

**Why (plain English):** On 2026-11-21 the live site scored 95–100 on a
phone, with two small misses, both caused by the JavaScript the phone
has to download and run:

- **Home, TBT 246 ms (limit 200).** TBT (Total Blocking Time) is how long
  the page is too busy to answer a tap. Five charger runs gave 325, 237,
  284, 186 and 246 ms. The busy time is React bringing the page to life
  (hydration): 615 ms of work in the React and Next.js chunk, with one
  297 ms long task.
- **Place page, LCP 2.60 s (limit 2.5).** LCP (Largest Contentful Paint)
  is when the biggest picture appears. On the real page it takes about
  0.33 s. On Lighthouse's pretend slow-4G phone, the 28 KB header photo
  shares the connection with 18 scripts (about 340 KB), so it waits.
  Four fixes that only touched the photo did not help (see
  `docs/evaluations/2026-11-21-lighthouse.md`).

A real traveler on a mid-range phone and mobile data feels both: a
first tap that does nothing for a moment, and a header photo that
appears late.

**What we already know (agent, 2026-11-21, by reading the code):**

- `src/components/HomePage.tsx` starts with `"use client"`, so the
  **whole home page** runs in the browser, and React must bring every
  section to life, including ones that never change after loading:
  `AboutIloilo`, `FeaturesSection`, `Footer`. Moving the parts that
  have no clicks or state back to the server (Server Components) means
  less code to download and less hydration work. That is the likely
  biggest win for home's TBT.
- Home also imports `useTableChanges` (`src/lib/realtime.ts`, live
  updates), which brings the Supabase browser client. Loading it a
  moment after the page is ready, instead of with the first scripts,
  would take it out of the busy time.
- On a place page, parts below the photo (reviews, the photo gallery)
  could load their code later, so the header photo has the connection
  to itself first.

These are leads, not decisions. The measurement in the first box
decides the order.

## Agent steps

1. **Measure before changing.** Build (`npm run build`) and list each
   chunk that home and a place page load, with its size, and what is in
   it. Use Next.js's own output, or the Coverage tab in Chrome DevTools.
   No new tool without the team's agreement. Write the top five in the
   progress note.
2. **Baseline:** two phone Lighthouse runs on a local production build
   (`npm run build` + `npm start`, then
   `npm run perf:lighthouse:local -- DEVICES=mobile`), on the charger.
3. **One change at a time,** most promising first. After each change,
   two runs on the same build setup. Keep a change only if it measurably
   helps, and say so with the numbers.
4. If three changes in a row don't help, stop and explain, as the team
   rule asks.
5. Checks: `npx tsc --noEmit`, `npx eslint src`, `npm run test`,
   `npm run build`, the searches in `.claude/rules/frontend.md`, and a
   look at the four widths.
6. Never lower a Lighthouse budget or a k6 threshold to get a ✓.

## Team tests (after the push, live URL, phone and laptop)

1. Plug in the charger, then run `npm run perf:lighthouse:mobile` twice
   and paste both.
2. Hard refresh (Ctrl+Shift+R) and use home: search, chips, paging,
   the navbar dropdown, Scroll to top.
3. Open a place: gallery, write and delete a review with a photo, like,
   reply.
4. Two tabs on one place: a review in one appears in the other (live
   updates).
5. DevTools Console: no errors and no CSP lines.

## Not in this ticket

- Changing the budgets (Google's "good" limits stay).
- Redesigning any section. It must look and work the same.
- The laptop results (already 99–100).

## Progress (2026-11-21, agent, local production build, laptop on the charger)

**Measured first.** Both pages load about 365 KB of compressed script
(18–19 files). The biggest pieces:

| Piece | Compressed | Needed at the start? |
|---|---|---|
| React itself (`react-dom`) | 72 KB | yes |
| **Supabase browser code** | **67 KB** | **no**: only for live updates, which start after the page is on screen |
| Next.js router | 46 KB | yes |
| `motion` (animations) | about 49 KB | yes (navbar, fade-ins) |
| axios and the reviews code | 29 KB | used by the navbar's login check |

Lighthouse's own breakdown showed that home's busy time is not the
first start. It is the moment the places arrive: React draws about 50
cards in one 233 ms piece, and each card's fade-in wrapper (`Reveal`)
measured and changed styles in turn, forcing the browser to lay out the
whole page again for each card.

**Three changes, each measured on the same local build (phone, 2–3
runs each):**

| # | Change | Home TBT (≤ 200 ms) | Place LCP | Kept |
|---|---|---|---|---|
| — | Before | 187 / 185 ms | 4.22 / 4.22 s | |
| 1 | Live updates download the Supabase code on demand (`src/lib/realtime.ts`) | 225 / 271 / 210 / 181 ms (noise) | **4.07 / 4.07 s** | yes: −67 KB, place LCP −0.15 s |
| 2 | `Reveal` measures first, changes styles in the next frame (`src/components/Reveal.tsx`) | 206 / 159 / 168 ms | 4.06 s | yes: layout time 3× lower |
| 3 | The cards are drawn in small pieces (`startTransition` in `src/components/HomePage.tsx`) | **141 / 127 / 149 ms ✓** | (home only) | yes |

Home Performance went from 97 to 99. Local LCP is always about 1.6 s
higher than live, because the local website's backend calls reach the
database in Mumbai. Live place LCP was 2.60 s, so after change 1 it
should be about 2.45 s, but that is an estimate: only the live run
after the push decides it.

**Checked:**

- `npx tsc --noEmit` and `npx eslint src` are clean.
- `npm run test`: 107 tests pass, including 3 new ones in
  `src/lib/realtime.test.tsx`. The "opens nothing if the page is left
  before the Supabase code arrives" test fails on the old code and
  passes on the new.
- The production build passed. It ran on an identical copy of the repo,
  so the team's server on port 3000 kept running.
- `perf:site:smoke` on that build: all thresholds ✓, every security
  check 100 %.
- In Google Chrome (phone and laptop widths): cards below the screen
  stay hidden and fade in when scrolled to, exactly like the old code on
  port 3000. Live updates connect (Realtime channel joined) on home and
  a place page, with no console errors.

**Not checked yet:** the live site (not pushed), real phones, and the
team's hands-on tests below. Every box above stays unticked until the
team confirms it.

**Not done, and why:** the place page's remaining scripts are the
reviews, photo gallery and navbar code. Loading them later would change
what shows first on the page (the reviews would arrive after it), so
that is a team decision, not part of this ticket's "nothing changes"
rule.
