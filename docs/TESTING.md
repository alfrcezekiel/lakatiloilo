# Testing strategy — Lakat Iloilo

How we check the quality of the Lakat Iloilo tourism platform, layer by
layer, using the tools that teams building Next.js, NestJS and Supabase
apps already use.

> **Status (2026-11-23):** these layers are built and passing:
>
> - **L1–L5 on localhost, for tickets 161–167** (team run, 2026-11-23):
>   website unit + component 184 of 184, backend unit 84 of 84, API 234 of
>   234, every database check safe (`00`, `13`, `15`, `16`, `17`), and
>   browser + accessibility 101 passed with 6 skipped on purpose (header
>   checks run on the laptop only). `npm run test:e2e:chrome` runs L5 with
>   the installed Google Chrome, so Playwright's browsers aren't needed.
>   The first L5 run found two real bugs, both fixed: invalid list HTML in
>   the place panel (`PanelFact`), and a newly posted review hidden behind
>   Show more (the traveler's own review now comes first).
>   **Not checked by these tests:** a real video upload to Storage, the
>   admin video and storage screens in a full browser, and a live update
>   keeping the chosen sort. The production build passes (`npm run build`,
>   team run, 2026-11-23). The team checked a real video by hand on localhost: added, removed, gone from the bucket,
>   and the Overview's Storage used dropped within 5 seconds (ticket 167).
> - **Every k6 test, local and live** (L8, team run, 2026-11-21): all 14
>   runs passed (backend smoke, stress, spike, soak; website smoke,
>   stress, spike, soak; live backend smoke and load; live website load,
>   stress, spike, soak), 0 errors in 123,825 requests, up to 150
>   travelers. Live pages p(95) 0.28 s under stress. Every security check
>   passed. Lighthouse on a phone: home now passes (TBT 186 ms); the
>   place page's LCP is still 2.60 s ✗ (simulated slow 4G). A head
>   preload was tried and made no difference, so the open lever is less
>   JavaScript on that page, as its own ticket. See
>   `docs/evaluations/2026-11-21-k6.md` and `2026-11-21-lighthouse.md`.
> - **Performance through the website** (L8, k6, 2026-11-21): `npm run perf:site:smoke`
>   checks the pages and the `/api` proxy (tickets 151–156) on every answer:
>   enforced CSP with a fresh nonce, and the backend's address and headers
>   hidden. It passed on a local production build (port 3001): pages p(95)
>   0.70 s, `/api` p(95) 0.34 s, 96 of 96 checks. Against a pretend site with
>   planted mistakes, all 8 security checks failed, as they should.
>   The team then ran `perf:site:load` (20 travelers, 7 min, on
>   `npm run dev`): passed, pages p(95) 0.76 s, `/api` 0.42 s, 0 errors in
>   3,090 requests, 15,327 of 15,327 security checks. The site smoke on the
>   live URL passed too (pages 0.29 s, `/api` 0.32 s). See
>   `docs/evaluations/2026-11-21-k6.md`. Lighthouse
>   (`npm run perf:lighthouse`) now also checks each page for an enforced
>   CSP, no CSP errors in the console and no request to the backend's
>   address (all ✓ on the live site), and warns when the laptop's CPU is
>   slow (on battery). See `docs/evaluations/2026-11-21-lighthouse.md`.
> - **Page quality** (L8, Lighthouse, 2026-11-18): `npm run perf:lighthouse`
>   scores the live site's home, place and login pages on a phone and a
>   laptop. **Accessibility is 100 everywhere.** On a laptop every page is
>   fast (LCP 0.3–1.1 s). On a phone, home is slow (performance 62, LCP
>   6.5 s, TBT 450 ms) and the place page's LCP is 3.3 s. Best Practices on
>   home is 77 because of Wikimedia's cookies on its photos, and SEO on
>   place pages is 91 (no meta description). **Fixed locally (not pushed
>   yet):** the home LCP on a phone is now 0.9 s (performance 96–97). The
>   cause was two fades that started invisible, the whole-page fade and the
>   hero's. Place pages now have a meta description in the `<head>` (SEO
>   100). See
>   `docs/evaluations/2026-11-18-lighthouse.md`.
> - **Frontend unit + component** (L1–L2): 96 tests in 13 files (2026-11-20) in
>   `src/**/*.test.ts(x)`, run with `npm run test` at the root. They use
>   Vitest 4 with React Testing Library, and MSW as the pretend backend
>   (`test/mocks/`). The login is always pretend (`vi.mock("@/lib/login")`).
>   Vitest 4 rather than 5, because 5 needs `@types/node` 22+ and the
>   project uses 20. The tools were installed with
>   `npm install -D --legacy-peer-deps …`, because npm 10.9 crashed
>   ("reading 'edgesOut'") while working out peer dependencies. Use the
>   same flag to add more test tools.
> - **End-to-end + accessibility** (L5): 31 runs (16 tests on a 1280 px
>   laptop and a 375 px phone; axe on the laptop) in `e2e/flows/` and
>   `e2e/a11y/`, plus 28 address-attack runs (`e2e/flows/address-attacks.spec.ts`).
>   Run with `npm run test:e2e` while the team's dev servers
>   are running. Local runs can only reach localhost
>   (`e2e/fixtures/test.ts`), and every login is pretend. All 31 pass. On
>   their first run (2026-11-17) they found a real bug, now fixed in
>   `Reveal.tsx`: the reviews on a place page jiggled forever when their
>   top edge was near the bottom of the screen. The fade-in's own slide
>   kept moving them off the screen and back on.
>
>   **Added 2026-11-20:** 12 more runs. `npm run test:e2e` now gives 71
>   passed and 6 skipped (header checks run on the laptop only).
>   - `e2e/flows/traveler-journey.spec.ts`: a whole visit in one go
>     (search → place → log in → back → post a review with ñ → see it).
>     Login and save are pretend. It also checks that the review was sent
>     to `/api/v1/reviews` with the login, the trimmed words, and no owner
>     field.
>   - `e2e/flows/hidden-backend.spec.ts` (tickets 151–153): the browser
>     only calls `/api`, never `localhost:5000` or the live backend, and
>     no page, script or data answer it downloads names the backend. The
>     `/api` answer carries no backend headers, and `/api` refuses
>     anything outside `v1/`.
>   - `e2e/flows/content-security-policy.spec.ts` (ticket 156): every
>     page has the enforced header (not report-only), with
>     `frame-ancestors 'none'` and `object-src 'none'`, and so does a
>     hidden admin page's 404. The app's own pages cause no violation. A
>     script, an image and a `fetch` to example.com are all blocked with
>     disposition `enforce`.
>
>   Each check was proved able to fail. Switching the CSP to report-only
>   failed 3 of the 4 CSP tests; the fourth correctly still passes. A
>   planted address failed the request check and the download check. The
>   first version of the download check missed it: it read a page's text
>   after the browser had thrown it away. It now downloads each file again
>   to read it.
> - **Database / RLS** (L4): 8 read-only checks in `supabase/checks/`. The
>   team pastes `00-summary.sql` into the Supabase SQL editor, and every
>   row should say "✓ safe". The checks were first proved on a throwaway
>   local Postgres (not Supabase): they passed a safe copy and caught one
>   planted mistake of each kind. **The team ran them on the hosted
>   project on 2026-11-17, and everything was safe:**
>   - RLS is on for every table, and every table has a policy.
>   - There are no open write policies, and logged-out visitors have no
>     write rights.
>   - Every owner's-rights function fixes its `search_path`.
>   - No role can skip RLS.
>   - Both photo buckets are 2 MB, JPG/PNG/WebP, and only logged-in owners
>     or admins may change files.
>
>   The functions logged-out visitors may call are all trigger functions,
>   which can't be run directly. One of them, `rls_auto_enable`, isn't in
>   `supabase/sql`: it's an event trigger (`ensure_rls`, owned by
>   `postgres`) that switches RLS on for every new table, probably set up
>   by a Supabase project setting (see `05` Part C).
>
>   **Added 2026-11-20 (not yet run on the hosted project):** 7 more
>   read-only checks, `08`–`14`. Rows 08–12 are in `00-summary.sql`.
>   - `08`: private tables a logged-out visitor can read (admins,
>     notifications, reports, hidden texts…). Part B: columns like
>     `email` or `token` they can read.
>   - `09`: write rules that never check who is asking (`auth.uid()` or
>     `is_admin()`).
>   - `10`: views that skip RLS (no `security_invoker`).
>   - `11`: `lakat_api` owning a table, writing directly, or belonging to
>     a role other than `authenticated`.
>   - `12`: Realtime sending a table without RLS, or one the app does not
>     listen to.
>   - `13`, run on its own: saved rows that break the app's rules (own
>     Helpful marks, reviews of places that don't exist, photos outside
>     the writer's folder…). Every count should be 0.
>   - `14`: speed advice, not a security check. It lists rules that call
>     `auth.uid()` once per row, and links with no index.
>
>   Like 01–07, they were first proved on a throwaway local Postgres:
>   every check showed 0 on a safe copy and caught one planted mistake of
>   each kind.
>
>   **The team ran L4 on the hosted project on 2026-11-23: all safe.**
>   `00-summary.sql` shows all 11 rows `✓ safe`, `13` shows 0 on all 12
>   rules, `15` and `16` return no rows, and `17` shows 26 of 26 `✓ safe`.
>
>   **Added 2026-11-23:** `17`, run on
>   its own, for tickets 164–167. It gives 26 rows, each `✓ safe` or
>   `✗ look at this`, and shows only counts.
>   - Rows 01–17, the rules: the video bucket's exact limits, the five
>     Storage rules and that each is strict enough, the own-video guard, and
>     the two admin functions.
>   - Rows 18–26, the saved data: reviews and video files agree (none
>     missing, shared or forgotten), file owners, sizes and types, `.webp`
>     names, and storage under the 80 % warning.
>
>   Proved on a throwaway local Postgres with stand-ins for Supabase's
>   `storage` and `auth` and the real 065–067 files: a safe copy showed 26
>   of 26 safe, and each of 26 planted mistakes failed its own row and no
>   other.
>
>   **Re-run on the hosted project after the fixes (2026-11-20): all safe.**
>   `00-summary.sql` shows all 11 rows `✓ safe` (01–05 and 07–12), and
>   `13` shows 0 on all 12 rules.
>
>   **First run on the hosted project (2026-11-20): no security hole.**
>   - `08` and `09`: no rows.
>   - Three findings were the checks' own mistakes, fixed the same day:
>     - `08` Part B listed `accommodations.email`. That is a hotel's
>       front-desk email, public on purpose (SPEC: "Email the front
>       desk"), so it is now excluded.
>     - `12` listed `place_categories`, `reply_likes` and `review_photos`.
>       Files 047, 032 and 044 publish them, and all three have RLS, so
>       the expected list was short.
>     - `13` counted 66 bad notifications. They were Helpful-on-a-reply
>       notifications, where `reply_id` is the reply that was liked, so
>       its writer is the right person to tell (036). The rule now checks
>       each notification kind separately.
>   - `14` Part B listed 13 links with no index. Only
>     `notifications.review_id` and `notifications.reply_id` are worth
>     one: deleting a review or reply must find its notifications. The
>     others point at `auth.users` and only matter when an account is
>     deleted. **Fixed:** `supabase/sql/064-notification-indexes.sql`
>     adds both indexes. The team ran it on the hosted project on
>     2026-11-20 and reported that it worked. A re-run of `14` confirms
>     it: Part A has no rows, and Part B now lists 11 links, all to
>     `auth.users`. That is accepted: they only matter when an account is
>     deleted.
> - **Security scan** (L7): the OWASP ZAP plans are in `security/zap/`.
>   - The passive scan of the live site ran on 2026-11-17: no High, no Low,
>     and 1 Medium, the known, parked Content-Security-Policy. Two
>     confirmed false alarms are recorded with narrow filters. See
>     `docs/evaluations/2026-11-17-zap.md`.
>   - **2026-11-20:** new `baseline-local.yaml`. The team's scans found 4
>     kinds of Medium alert (CSP not set on `/api` and on the backend,
>     `'unsafe-inline'` scripts and styles, dev-only `'unsafe-eval'`) plus
>     `Access-Control-Allow-Origin: *` on pre-built live pages. All fixed:
>     nonce-based CSP, every page built per visit, a policy on the backend.
>     A re-scan of a local production build shows **0 Medium**. See
>     `docs/evaluations/2026-11-20-zap.md`. Later the same day: the dev
>     server's two dev-only items (`'unsafe-eval'`, inline `<style>`) are
>     lowered to Info in the local plans, only when the policy has
>     `'unsafe-eval'` (proved narrow). A dev-server scan now shows 0 Medium.
>   - The team ran the active localhost scan: 3,104 attack requests, no
>     injection, XSS or path traversal found, and only the CSP alert.
>   - DOM XSS: ZAP now drives headless Chrome (Ubuntu's Firefox is a snap
>     it can't control). On the 2026-11-18 run, DOM XSS finished on the
>     backend (98 requests, nothing found), but ran out of time on the
>     website. Given its own 15-minute step (2026-11-18), it "completed"
>     on the website but loaded no pages there. A deliberately vulnerable
>     canary page proved the rule itself works (2 High found). So the
>     website's DOM XSS is tested directly instead, in
>     `e2e/flows/address-attacks.spec.ts`: no script from the address ran
>     on any of 6 pages. That test also found an **open redirect** after
>     log-in: `?next=/%09/evil.example` (with a tab or a newline) sent the
>     traveler to another site. **Fixed 2026-11-18** in `safeNextPath`
>     (`src/lib/auth.ts`): the browser's own URL reader now decides where
>     `next` really goes, and only this site is allowed. 16 unit tests in
>     `src/lib/auth.test.ts`; all 14 address-attack tests pass on laptop and
>     phone.
> - **Real writes** (L5): `e2e/real-writes/` (6 tests) writes a review,
>   edits it, replies and deletes the reply, marks another review Helpful
>   and un-marks it, then deletes the review. They need the team's
>   dedicated test account in `.env.test.local`, and the team runs them
>   with `npm run test:writes`; without the account they are skipped. They
>   clean up after themselves. **The team ran them with their test
>   account on 2026-11-18: 6 of 6 passed in 14 s, and no `[test]` review or
>   reply was left behind.**
> - **Live smoke** (L6): 7 read-only tests in `e2e/smoke/`, run with
>   `npm run test:smoke` after a push. All passed on 2026-11-17. The same
>   file runs on the team's dev servers with `npm run test:smoke:local`
>   (project `smoke-local`: the website on localhost:3000, the backend
>   checks on localhost:5000). 7 of 7 passed locally on 2026-11-20.
> - **Recent pushes smoke** (L6, added 2026-11-20): 9 read-only tests in
>   `e2e/smoke/recent-pushes.smoke.spec.ts` for the latest pushes: no
>   broken photos, place photos at original size, small WebP review
>   previews, the `/api/wikimedia-photo` relay (serves a thumbnail with no
>   cookies, refuses other paths), the enforced CSP blocking nothing of
>   ours with Supabase live updates still connecting, the full policy on
>   every page (no `'unsafe-eval'` on live), no backend address in any
>   downloaded script, and the live site answering from Mumbai (`bom1`).
>   Live: 16 of 16 smoke tests passed (39.5 s). Local: 8 passed, 1 skipped
>   (Mumbai is live-only). A planted match made the script check fail, as
>   it should. The CSP listener now lives in `e2e/helpers/csp.ts`, shared
>   with `e2e/flows/content-security-policy.spec.ts`.
>   **The team re-ran both on their own machine on 2026-11-20:**
>   `test:smoke:local` 15 passed, 1 skipped (Mumbai, live-only) in
>   32.8 s; `test:smoke` 16 of 16 passed in 38.7 s.
> - **Backend unit** (L1): 63 tests in `backend/src/**/*.spec.ts`, run with
>   `npm run test` in `backend/`.
> - **Backend API** (L3): 195 tests in `backend/test/api/`, run with
>   `npm run test:api` in `backend/`.
> - **Backend test types** (L0): Jest only translates the test files and
>   skips type-checking them (`isolatedModules` in
>   `backend/tsconfig.spec.json`), which keeps each file well under the
>   5-second "slow" mark. Check the test files' types with
>   `npm run typecheck` in `backend/` (2026-11-20). The app is the real `/v1` API, with a
>   pretend empty database and a pretend Supabase login check
>   (`backend/test/fakes/`).
> - **Performance** (L8): `performance/k6/`. The load test passed (see
>   `docs/evaluations/2026-11-17-k6.md`).
>
> Backend test settings:
>
> - `backend/tsconfig.spec.json` is used by the tests.
> - `backend/tsconfig.build.json` keeps test files out of `dist/`.
> - `backend/src/app-setup.ts` holds the headers, CORS and "unknown address"
>   setup, shared by `main.ts` and the tests.
>
> The other layers are still a plan. Their tools are not installed yet,
> and the team agrees before each one is added. Installing them adds development-only packages, plus two free
> programs: the OWASP ZAP desktop app for security scans and the Grafana k6
> command-line tool for performance tests. So the team agrees first
> (CLAUDE.md: nothing outside the stack without agreement). None of these
> tools is paid (we never use Grafana Cloud), and none needs Docker.

## The idea in one picture: the testing pyramid

```
                   ▲  slow, few, run least often
                  ╱ ╲
                 ╱ 8 ╲                  Performance          (k6 — load, stress, spike, soak · Lighthouse — page speed, a11y, quality)
                ╱─────╲
               ╱   7   ╲                Security scan        (OWASP ZAP — passive on live URL, active on localhost)
              ╱─────────╲
             ╱     6     ╲              Live smoke check     (Playwright, read-only, live URL)
            ╱─────────────╲
           ╱       5       ╲            End-to-end + a11y    (Playwright + axe-core)
          ╱─────────────────╲
         ╱         4         ╲          Database / RLS check (SQL checks in the Supabase SQL editor)
        ╱─────────────────────╲
       ╱           3           ╲        API integration      (Jest + @nestjs/testing + supertest)
      ╱─────────────────────────╲
     ╱             2             ╲      Component            (Vitest + React Testing Library + MSW)
    ╱─────────────────────────────╲
   ╱               1               ╲    Unit                 (Vitest frontend, Jest backend)
  ╱─────────────────────────────────╲
 ╱                 0                 ╲  Static checks        (TypeScript + ESLint) — already in place
 ▼  fast, many, cheapest to run
```

The two top layers ask different questions from the rest. Layers 0–6
check that the app **does what it should**. Security (7) checks what an
**attacker** could do that nobody planned for. Performance (8) checks
whether the app **keeps working when many travelers arrive at once**: a
school trip, a festival weekend like Dinagyang, a post shared on
Facebook. They sit at the top because they are the slowest (a soak test
runs for an hour) and run least often (after a round of tickets and
before a demo). They also need the layers below to be green first: there
is no point load-testing or scanning a build that fails its own tests.

**Jargon:** a *unit test* checks one function on its own. An *integration
test* checks that several pieces work together (here: a real NestJS route,
its guard and its service). An *end-to-end (E2E) test* drives a real
browser through a whole task, the way a traveler would. *Mocking* means
swapping a real dependency (the database, the backend) for a pretend one
that gives a fixed answer, so the test is fast and repeatable.

Write **many** tests at the bottom and **few** at the top: bottom tests
run in milliseconds and point at the exact broken line; top tests are
slower and flakier but prove the whole app works.

## Recommended tools per layer

| # | Layer | What it proves for Lakat Iloilo | Tool | Why this tool |
|---|-------|---------------------------------|------|---------------|
| 0 | Static | No type errors, no obvious bad patterns | `tsc --noEmit`, ESLint | Already installed; free and instant |
| 1 | Unit — frontend | Helpers in `src/lib/` (labels, thread folding, category icons) return the right thing | **Vitest** | Recommended in the Next.js docs; fast, TypeScript out of the box |
| 1 | Unit — backend | Services decide correctly (who may edit a review, Trash rules, near-me query maths) | **Jest** + `@nestjs/testing` | NestJS's own default; `Test.createTestingModule` swaps repositories for fakes |
| 2 | Component | A card, form or dialog renders, shows errors, is keyboard-usable | **Vitest + React Testing Library + jsdom**, **MSW** for pretend backend answers | Tests what the user sees, not internals; MSW fakes the axios calls in `src/lib/api.ts` |
| 3 | API integration | A real HTTP request hits the route, the login check, the admin-only middleware, validation, and gets the right status code | **Jest + supertest** on a Nest app built in the test | Covers the refusal cases (no login → 401, traveler on admin route → 403, bad id → 400) without a running server |
| 4 | Database / RLS | Every table has Row Level Security ON and explicit policies | **Read-only SQL checks** in `supabase/checks/`, run in the hosted Supabase SQL editor | pgTAP needs local Supabase (Docker) — not allowed here; a read-only query over `pg_tables` / `pg_policies` gives the same safety answer |
| 5 | End-to-end | Traveler finds a destination, opens it, writes a review; admin moves a place to Trash | **Playwright** | Real Chromium/Firefox/WebKit, phone sizes, `page.route` to fake login answers |
| 5 | Accessibility | WCAG 2.2 AA problems (contrast, labels, focus) | **@axe-core/playwright** | Runs inside the Playwright tests; complements `/evaluate-app accessibility` |
| 6 | Live smoke | The deployed Vercel URL loads home, a destination, login page — after each push | **Playwright** (read-only project) | Same tool, pointed at the live URL; never logs in |
| 7 | Security scan | Missing security headers, unsafe cookies, CORS that is too open, error pages that leak details, and (active scan) injection and cross-site scripting (XSS) | **OWASP ZAP** (Zed Attack Proxy): desktop app + Automation Framework plans in `security/zap/` | Free and open source, run by the OWASP Foundation. Works without Docker. Its alerts line up with the OWASP Top 10 |
| 8 | Performance & load | The API stays fast and error-free with many travelers at once. Finds the breaking point, survives a sudden rush, doesn't slow down over an hour | **Grafana k6** (open source, run on your laptop), scripts in `performance/k6/` | Free, a single program (no Docker). Tests are written in JavaScript, which the team already knows. Pass/fail *thresholds* turn "feels slow" into a number |
| 8 | Page quality (one visitor) | **Core Web Vitals** (how fast the main content appears, how much the page jumps, how long it is too busy to react), **accessibility**, **best practices** and **SEO**, on a phone and on a laptop | **Lighthouse** (Google, free, npm package), runner in `performance/lighthouse/` | The same scores Google and Chrome DevTools use. One command checks several pages on both devices against Google's published "good" limits |

**What we deliberately do not use:** Cypress (Playwright does the same and
is already the tool our skills reason about), local Supabase / pgTAP
(needs Docker), paid testing clouds (including Grafana Cloud k6: the k6
program on your own laptop is enough), JMeter or Locust (k6 does the same
in JavaScript).

## How to structure the test directories

```
lakatiloilo/
├─ vitest.config.mts               frontend unit + component runner
├─ playwright.config.ts            E2E, a11y and live smoke runner
│
├─ src/                            Next.js frontend
│  ├─ lib/
│  │  ├─ thread-folding.ts
│  │  └─ thread-folding.test.ts            ← L1 unit, next to the code
│  └─ components/
│     ├─ ui/button.tsx
│     ├─ ui/button.test.tsx                ← L2 component, next to the code
│     └─ admin/trash-list.test.tsx
│
├─ test/                           shared frontend test helpers (no tests here)
│  ├─ setup.ts                     jest-dom matchers, start/stop MSW
│  ├─ render.tsx                   render() wrapped in QueryClientProvider
│  ├─ mocks/
│  │  ├─ handlers.ts               pretend backend answers, one per route
│  │  └─ server.ts                 MSW server for Vitest
│  └─ fixtures/
│     └─ destinations.ts           fake but realistic Iloilo places
│
├─ backend/
│  ├─ src/v1/reviews/
│  │  ├─ reviews.service.ts
│  │  ├─ reviews.service.spec.ts           ← L1 unit, next to the code
│  │  └─ reviews.controller.spec.ts
│  └─ test/
│     ├─ jest-e2e.json             config for the API tests only
│     ├─ helpers/
│     │  ├─ create-test-app.ts     builds the Nest app with fakes plugged in
│     │  └─ tokens.ts              fake "logged-in" headers (never real tokens)
│     ├─ fakes/
│     │  ├─ repository.fake.ts     in-memory stand-in for TypeORM repositories
│     │  └─ supabase.fake.ts       stand-in for SupabaseService (auth, storage)
│     ├─ fixtures/                 sample rows: places, reviews, replies
│     └─ api/
│        ├─ reviews.e2e-spec.ts            ← L3 API integration
│        ├─ admin.e2e-spec.ts
│        └─ refusals.e2e-spec.ts   401 / 403 / 400 / 404 for every route group
│
├─ e2e/                            Playwright (whole app in a browser)
│  ├─ fixtures/
│  │  └─ fake-login.ts             page.route() pretend login answers
│  ├─ flows/
│  │  ├─ traveler-browse.spec.ts           ← L5 E2E
│  │  ├─ traveler-review.spec.ts
│  │  └─ admin-trash.spec.ts
│  ├─ a11y/
│  │  └─ pages.a11y.spec.ts                ← L5 accessibility (axe)
│  └─ smoke/
│     ├─ live.smoke.spec.ts                ← L6 live URL, read-only
│     └─ recent-pushes.smoke.spec.ts       ← L6 features from the latest pushes
│
├─ supabase/
│  ├─ sql/                         (existing) numbered changes
│  └─ checks/                                ← L4 database checks
│     ├─ 01-rls-is-on.sql          lists any public table without RLS
│     └─ 02-policies-exist.sql     lists tables with RLS but no policy
│
├─ security/
│  └─ zap/                                   ← L7 security scan (OWASP ZAP)
│     ├─ baseline-live.yaml        passive scan of the live site + API
│     ├─ active-local.yaml         active scan of localhost only
│     ├─ api-urls-live.txt         live API GET routes for ZAP to visit
│     ├─ api-urls-local.txt        the same routes on localhost:5000
│     └─ reports/                  ZAP's HTML reports (git-ignored)
│
└─ performance/
   ├─ k6/                                    ← L8 performance & load (Grafana k6)
   │  ├─ lib/
   │  │  ├─ config.js              BASE_URL, the live-URL safety guard
   │  │  ├─ routes.js              public GET routes and their weights
   │  │  ├─ thresholds.js          shared pass/fail limits
   │  │  ├─ traveler.js            setup() finds place ids; visit() = one visit
   │  │  └─ site.js                the same on the WEBSITE: pages + /api, CSP and hidden-backend checks
   │  ├─ scenarios/
   │  │  ├─ smoke.js               1 user, 30 s: does the script work?
   │  │  ├─ load.js                normal busy day
   │  │  ├─ stress.js              keep adding users until it breaks
   │  │  ├─ spike.js               sudden rush, then back to quiet
   │  │  ├─ soak.js                normal load for an hour
   │  │  ├─ breakpoint.js          one ramp to 400 users that stops itself when the app breaks
   │  │  ├─ site-smoke.js          website: every page and /api route once, 40 s
   │  │  ├─ site-load.js           website: 20 users, 7 min (the team starts it)
   │  │  ├─ site-stress.js, site-spike.js, site-soak.js   website versions of the above
   │  │  └─ site-breakpoint.js     website: ramp to 400 until it breaks
   │  └─ results/                  JSON summaries (git-ignored, .gitkeep only)
   └─ lighthouse/                            ← L8 page quality (Lighthouse)
      ├─ budgets.mjs               pass marks: Google's "good" limits
      ├─ run.mjs                   checks home, place, login on phone + laptop
      └─ reports/                  HTML reports + summary.json (git-ignored)
```

### Why it is laid out this way

1. **Unit and component tests live next to the file they test**
   (`thread-folding.ts` + `thread-folding.test.ts`). When you open a file
   you see at once whether it is tested; when you move or delete it, the
   test moves with it. This is the default in both Vitest and NestJS.
2. **Tests that span many files get their own top-level folder.** An API
   test touches the controller, middleware, service and module together,
   so it lives in `backend/test/api/`, not inside one feature folder. The
   same goes for Playwright flows in `e2e/`.
3. **The file name says the layer.** `*.test.ts(x)` = frontend unit or
   component (Vitest). `*.spec.ts` inside `backend/src` = backend unit
   (Jest). `*.e2e-spec.ts` = backend API integration. `e2e/**/*.spec.ts` =
   Playwright. Each runner only picks up its own pattern, so they never
   run each other's files.
4. **Helpers, fakes and fixtures are separate from tests.** `fixtures/` is
   sample *data*, `fakes/` and `mocks/` are pretend *services*, `helpers/`
   is *setup code*. Tests import them, so one change to the shape of a
   review updates every test at once.
5. **Frontend and backend keep separate runners and configs.** They have
   separate `package.json` files and deploy separately; mixing their
   tests would mean one broken side blocks the other.
6. **Database checks sit beside the SQL they protect.** `supabase/checks/`
   is read-only and safe to run on the hosted project at any time.
7. **Security scan plans live in `security/zap/`, apart from the tests.**
   They are not run by `npm` and they don't pass or fail a build. They
   are plans you open in the ZAP app, and each file name says where it is
   allowed to point (`-live` = passive only, `-local` = localhost only).
   Raw reports stay out of git. A short summary goes in
   `docs/evaluations/`.
8. **Performance scripts live in `performance/k6/`, with one file per test
   type.** The shared parts (where to send traffic, which routes, what
   counts as "too slow") are in `lib/`, so all five scenarios measure the
   same thing and only the *shape of the traffic* changes. If you change a
   route or a limit once, every scenario uses the new one.

## Scripts to add (when the team agrees)

Root `package.json`:

```json
"test":        "vitest run",
"test:watch":  "vitest",
"test:e2e":    "playwright test --project=local",
"test:smoke":  "playwright test --project=live",
"test:smoke:local": "playwright test --project=smoke-local",
"perf:smoke":  "k6 run -e BASE_URL=http://localhost:5000 performance/k6/scenarios/smoke.js",
"perf:load":   "k6 run -e BASE_URL=http://localhost:5000 --summary-export performance/k6/results/load.json performance/k6/scenarios/load.js",
"perf:stress": "k6 run -e BASE_URL=http://localhost:5000 --summary-export performance/k6/results/stress.json performance/k6/scenarios/stress.js",
"perf:spike":  "k6 run -e BASE_URL=http://localhost:5000 --summary-export performance/k6/results/spike.json performance/k6/scenarios/spike.js",
"perf:soak":   "k6 run -e BASE_URL=http://localhost:5000 --summary-export performance/k6/results/soak.json performance/k6/scenarios/soak.js",
"perf:site:smoke": "k6 run -e SITE_URL=http://localhost:3000 performance/k6/scenarios/site-smoke.js",
"perf:site:load":  "k6 run -e SITE_URL=http://localhost:3000 --summary-export performance/k6/results/site-load.json performance/k6/scenarios/site-load.js",
"perf:lighthouse": "node performance/lighthouse/run.mjs"
```

The `perf:` scripts call the k6 program, so k6 must be installed first
(see below). They point at localhost by default. `-e` passes a setting
into the script the same way in PowerShell and Git Bash.

`backend/package.json`:

```json
"test":        "jest",
"test:watch":  "jest --watch",
"test:api":    "jest --config ./test/jest-e2e.json",
"test:cov":    "jest --coverage"
```

All of these work the same in PowerShell and Git Bash.

## What to test first (highest value for a tourism platform)

1. **Refusals on the API** (L3) — anyone on the internet can call the
   backend. Prove that no-login, fake-login, traveler-on-admin and bad-id
   requests are refused with the right code.
2. **RLS check** (L4) — one query that must return zero rows.
3. **Review rules** (L1) — who may edit, delete, like, report, reply.
4. **Traveler browse flow** (L5) — home → destinations → one place, on
   laptop and phone widths.
5. **Live smoke** (L6) — after every push.
6. **ZAP baseline scan** (L7) — once per round of tickets and before
   every demo.
7. **k6 smoke, then load** (L8) — before the demo. Stress, spike and soak
   only when the team wants to know the limits.

## Security testing with OWASP ZAP

**What ZAP is:** a free security scanner that sits between a browser and
the website (a *proxy*). It looks at every request and answer and reports
weaknesses as *alerts*, each marked High, Medium, Low or Informational.

**The two kinds of scan:**

| Scan | What it does | Safe on the live URL? |
|------|--------------|-----------------------|
| **Passive / baseline** | Visits pages like a visitor and only *reads* the answers: headers, cookies, error messages, CORS | **Yes.** It sends normal GET requests |
| **Active** | *Attacks* every form and parameter it finds with SQL injection, XSS and path tricks, thousands of requests | **No. Localhost only** |

> ⚠️ **Why active scans never touch the live URL, and still need care on
> localhost:** our local backend (`localhost:5000`) is connected to the
> **hosted** Supabase database. An active scan of a route that saves data
> would fill the real database with junk reviews and replies. So the
> active plan runs **without a login**: every write route should answer
> 401 and nothing gets saved. That is also a useful test in itself.
> Afterwards, check that no new rows appeared. Never give ZAP a real
> login token.

### Install (no Docker)

1. Download the ZAP installer for your system from the official site,
   zaproxy.org. The Windows installer includes Java.
2. Open ZAP → *Automation* tab → **Load plan** → choose a file from
   `security/zap/` → **Run**.

Or from a terminal (PowerShell; the install folder may differ):

```powershell
& "C:\Program Files\ZAP\Zed Attack Proxy\zap.bat" -cmd -autorun "$PWD\security\zap\baseline-live.yaml"
```

### The plans (already in `security/zap/`)

The example plan that was here is replaced by the real files. Each one
starts with a comment that says what it does and how to run it.

| File | What it does | Who runs it |
|------|--------------|-------------|
| `baseline-live.yaml` | **Passive**: it crawls the live site, visits the GET routes in `api-urls-live.txt`, and reads every answer. Takes about 30 s–6 min | Anyone, at any time |
| `baseline-local.yaml` | **Passive**, the same scan on `localhost:3000` and `:5000`, before a push. Never sends a form; log-in and admin calls are out of scope. Run it on a **production build** (`npm run build`, then `npm start`), not `npm run dev`, which adds dev-only CSP alerts. About 1–6 min | Anyone, with the production website and the backend running |
| `active-local.yaml` | **Active**: it attacks `localhost:3000` and `:5000` only, **with no login**. Log-in, sign-up and admin routes are excluded. 2 threads, stops after 15 min | **The team**, after agreeing to it |
| `api-urls-live.txt`, `api-urls-local.txt` | 13 public GET routes, plus 2 addresses that must answer 404 (to check that error pages leak nothing) | — |
| `site-urls-live.txt`, `site-urls-local.txt` | The website's pages, its `/api/v1` proxy (151–153) and the `/api/wikimedia-photo` relay, plus addresses that must answer 404. Added 2026-11-20 | — |
| `reports/` | The HTML and JSON reports (git-ignored, except `.gitkeep`, which keeps the folder) | — |

Run, from the project folder (Ubuntu):

```bash
zap.sh -cmd -port 8099 -autorun "$PWD/security/zap/baseline-live.yaml"
```

On Windows, use the PowerShell line at the top of each plan, or the ZAP
app: **Automation** tab → **Load plan** → **Run**. Paths inside a plan
(`api-urls-…`, `reports`) are read relative to the plan's own folder.

### Reading the results

| Alert you will probably see | Means | What to do |
|-----------------------------|-------|------------|
| Content Security Policy header not set | A page or answer arrived without the policy. The CSP is enforced since ticket 156, so on a page this is a **regression** | Find which address: `src/proxy.ts` sets it, and its `matcher` decides which addresses it runs on |
| CSP: script-src / style-src unsafe-inline | The policy lets inline scripts or `<style>` tags run. Fixed 2026-11-20: every page view gets a nonce (`src/proxy.ts`) | On a production build: a **regression**. Only `style-src-attr 'unsafe-inline'` (style="…" attributes, which can't run code) is meant to be there |
| CSP: script-src unsafe-eval | Only on `npm run dev`. The live build must not have it (the L6 smoke checks this) | Scan a production build (`npm run build` + `npm start`); on live: a regression |
| CSP: Failure to Define Directive with No Fallback | `base-uri`, `form-action` or `frame-ancestors` is missing: they don't fall back to `default-src` | Name each one. The backend's policy (`backend/src/app-setup.ts`) has all three since 2026-11-20 |
| Strict-Transport-Security missing | The browser isn't told to always use HTTPS | Vercel usually adds this. Check on the API too |
| Cookie without SameSite / HttpOnly / Secure | A cookie could be read by scripts or sent from other sites | Fix: set the flags where the cookie is made (`src/lib/admin-cookie.ts`) |
| CORS misconfiguration | Another website could call our API | Check that `CORS_ORIGIN` is unset (no browser needs it since ticket 152), or lists only our own sites |
| Application error disclosure | An error page shows stack traces or SQL | Fix: return a short message and log the details |
| SQL injection / XSS (active scan) | Untrusted input reaches the database or the page | **Stop and fix before the demo** |

- **High or Medium:** fix it or explain why it is a false alarm. A *false
  positive* is an alert that turns out not to be a real problem.
- Mark a confirmed false positive with an `alertFilter` job in the plan,
  with a comment saying why. Don't just delete it from the report.
- Write a short summary in `docs/evaluations/YYYY-MM-DD-zap.md`: the date,
  the plan, the number of alerts at each level, what was fixed and what
  was accepted.
- `security/zap/reports/` is git-ignored. Raw reports list every URL and
  are not useful in the repo.

**Not covered by ZAP:** RLS (that is L4), logic rules like "a traveler can
edit someone else's review" (that is L3), and anything behind a login.
ZAP finds the common, well-known mistakes. It doesn't replace the other
layers.

**Later, not now:** a GitHub Actions workflow could run the baseline scan
on every push. The official ZAP action runs Docker on GitHub's machines,
not on yours. Park it in `docs/LATER.md` until the team wants CI.

## Performance and load testing with Grafana k6

**What k6 is:** a free, open-source program from Grafana Labs. It
pretends to be many travelers using the app at once. Each pretend
traveler is a **virtual user (VU)**: a loop that calls our API, waits a
moment like a real person, and repeats. k6 measures how long each answer
took and how many failed, then compares them to our **thresholds**, the
pass/fail limits we agree on beforehand.

**Jargon:** *p(95)* ("95th percentile") is the time that 95 out of 100
requests beat. It is fairer than the average, because the average hides
the slow requests that annoy people. *Throughput* is requests per second.
*Error rate* is the share of requests that failed or got a 5xx answer.

### The five test types

Every test type sends the same requests. Only the *shape* of the traffic
changes:

```
 VUs                                                   
 ▲  smoke   ▁▁                       (1–2 VUs, 30 s)
 │  load    ╱‾‾‾‾‾‾‾‾‾╲              (ramp to 20, hold 5 min)
 │  stress  ╱‾╱‾╱‾╱‾╲               (20 → 50 → 100 → 150, step by step)
 │  spike   ▁▁▁╱|‾|╲▁▁▁             (5 → 100 in 10 s, back down)
 │  soak    ╱‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾‾╲    (20 for 60 min)
 └──────────────────────────────▶ time
```

| Type | Question it answers | Shape for Lakat Iloilo | Watch for |
|------|---------------------|------------------------|-----------|
| **Smoke** | Does the script work, and is the app up? | 1–2 VUs for 30 s | Any failure means fix the script before anything bigger |
| **Load** | Is it fine on a normal busy day? | Ramp to 20 VUs over 1 min, hold 5 min, ramp down | p(95) under 800 ms, errors under 1 % |
| **Stress** | Where is the breaking point, and how does it break? | Steps of 20 → 50 → 100 → 150 VUs, 2 min each. Stops itself when errors pass 5 % | The VU count where p(95) or errors jump. Does it fail gracefully (slow, clear errors) or crash? |
| **Spike** | Does it survive a sudden rush, like a viral post? | 5 VUs, jump to 100 in 10 s, hold 1 min, drop back to 5 | Errors during the jump, and whether it **recovers** afterwards |
| **Soak** | Does it get slower or break over time? | 20 VUs for 30–60 min | p(95) creeping up, database connections running out, the backend's memory growing |

The numbers are a starting point for a student demo app, not a target for
a big website. Agree real numbers with the team: how many travelers do
you expect on demo day? Write them in the summary.

### Safety first — read before running anything

> ⚠️ **Every k6 test hits the hosted Supabase database**, even from
> localhost, because the local backend (`localhost:5000`) uses the hosted
> project. Heavy tests can use up the free plan's limits, slow the app
> down for real users, or make Vercel or Supabase treat the traffic as an
> attack.

- **Read-only routes only.** Scripts send GET requests to public routes.
  Never POST, PATCH or DELETE, never log in, and never send a token.
- **Never point k6 at `*.supabase.co`.** We test our API, not Supabase's
  servers.
- **Smoke and load:** localhost or the live API.
- **Stress, spike and soak:** localhost by default. They run on the live
  URL only after the team agrees, at a quiet time, with the facilitator
  told first. These scripts **refuse to start** against anything other
  than localhost unless you add `-e LIVE_OK=yes` (see `lib/config.js`).
- Check the free-plan limits of Vercel and Supabase before a long soak or
  a big stress test on the live URL.
- Thresholds use `abortOnFail` on stress and spike, so k6 stops by itself
  once the app is clearly failing. We don't need to keep pushing after it
  breaks.
- Results from one laptop on Wi-Fi are limited by that laptop and
  network. Write down where the test ran from.

### Install (no Docker)

| System | Command |
|--------|---------|
| Windows (PowerShell) | `winget install k6 --source winget` |
| macOS | `brew install k6` |
| Linux | follow "Install k6" in the official Grafana k6 docs |

Check it worked with `k6 version`.

### The files (already in `performance/k6/`)

The code isn't copied here, because it would drift away from the real
files. Open them: each one starts with a comment that explains it.

| File | What it does |
|------|--------------|
| `lib/config.js` | Reads `BASE_URL` (default `http://localhost:5000`). Refuses any `supabase.co` address. `guardHeavyTest()` stops stress, spike and soak before the first request unless the target is localhost or the team passed `-e LIVE_OK=yes` |
| `lib/routes.js` | The public GET routes from `docs/SPEC.md`, each with a **weight**: how often a traveler visits it. `/v1/destinations` (4) is visited twice as often as `/v1/destinations/near` (2). The routes that need a place (`/v1/destinations/:id`, `/v1/accommodations/:id`, `/v1/reviews?place_type=…&place_id=…`) are listed apart, because place ids are UUIDs |
| `lib/thresholds.js` | `THRESHOLDS` for smoke, load and soak: p(95) under 800 ms, errors under 1 %, checks over 99 %. `HEAVY_THRESHOLDS` for stress and spike: p(95) under 1.5 s, and k6 stops by itself (`abortOnFail`) once errors pass 5 % |
| `lib/traveler.js` | What one pretend traveler does. `setup()` runs **once** before the test: it reads `/v1/destinations` and `/v1/accommodations` to find real place ids (up to 20 of each), and stops with a clear message if the backend isn't running. `visit()` picks a weighted route, sends a GET, checks for "200 and JSON", then waits 1–3 s like a person reading |
| `lib/site.js` | The website traveler (added 2026-11-21, after tickets 151–156). Calls the **website** (`SITE_URL`, default `http://localhost:3000`), not the backend: pages (home, log in, a destination, an accommodation) and the same data routes through `/api/v1/...`, the way a real browser does. `setup()` finds place ids through `/api` and opens each page once as a warm-up (the first visit after the website starts fills its caches: home took 0.85 s, then 0.3 s). Every page is checked for an **enforced** CSP (not report-only) with `frame-ancestors 'none'` and `object-src 'none'`, a script nonce that is new on every visit and matches the HTML, no `'unsafe-inline'` script, and no backend address in the HTML. Every `/api` answer is checked for no backend headers (`X-Powered-By`, CORS, `ETag`) and no backend address. These security checks are tagged `security:yes` |
| `scenarios/*.js` | Each one only sets `options` (how many travelers, for how long) and re-uses `setup` and `visit` (`site-smoke.js` uses `tour`: every page and route in turn) |

| Scenario | `options` | Takes about |
|----------|-----------|-------------|
| `smoke.js` | `vus: 1, duration: '30s'` | 30 s |
| `load.js` | ramp to 20 in 1 min, hold 5 min, ramp down 1 min | 7 min |
| `stress.js` | 2 min each at 20, 50, 100, 150, then down. Heavy thresholds and guard | 10 min |
| `spike.js` | 1 min at 5, 10 s up to 100, 1 min at 100, 10 s down to 5, 2 min at 5 to watch the recovery. Heavy thresholds and guard | 4.5 min |
| `soak.js` | 2 min up to 20, 60 min at 20 (or `-e SOAK_MINUTES=30`), 2 min down. Guard | 64 min |
| `site-smoke.js` | `vus: 1, duration: '40s'`, tours all 12 pages and `/api` routes. `SITE_THRESHOLDS`: p(95) under 800 ms for pages and for `/api` **separately** (setup's warm-up not counted), errors under 1 %, and **100 %** of the security checks | 45 s |
| `site-load.js` | like `load.js` (20 travelers, 7 min) on the website, `SITE_THRESHOLDS`. Guard (localhost unless `-e LIVE_OK=yes`) | 7 min |
| `breakpoint.js`, `site-breakpoint.js` | added 2026-11-21: one straight ramp from 0 to 400 travelers over 20 minutes (`-e BREAK_MAX_VUS=160…1000`, `-e BREAK_MINUTES=5…60`). The same "clearly failing" limits as stress (errors over 5 %, p(95) over 1.5 s, and on the website any security check failing), but **every** limit stops the test (`abortOnFail`). `vus max=` in the summary is how many travelers were on when it broke (a little after it really broke, because p(95) is judged over the whole run). Guard. Shared code in `lib/breakpoint.js` | up to 20 min |

Requests are tagged by route (`GET /v1/destinations/:id`), so the summary
groups them by route instead of listing every place id separately.

### Running

Every k6 test has an `npm run` command (added 2026-11-21). They work the
same in PowerShell and Git Bash. Run the smoke for a target before anything
bigger on it.

| Test | Backend direct (port 5000) | Website: pages + `/api` | Live backend | Live website | Takes |
|------|----------------------------|-------------------------|--------------|--------------|-------|
| Smoke (1 traveler) | `perf:smoke` | `perf:site:smoke` | `perf:live:smoke` | `perf:live:site:smoke` | 30–45 s |
| Load (20) | `perf:load` | `perf:site:load` | `perf:live:load` | `perf:live:site:load` | 7 min |
| Stress (to 150) | `perf:stress` | `perf:site:stress` | `perf:live:stress` 🔒 | `perf:live:site:stress` 🔒 | 10 min |
| Spike (to 100) | `perf:spike` | `perf:site:spike` | `perf:live:spike` 🔒 | `perf:live:site:spike` 🔒 | 4.5 min |
| Soak (20 for 1 h) | `perf:soak` | `perf:site:soak` | `perf:live:soak` 🔒 | `perf:live:site:soak` 🔒 | 64 min |
| Breakpoint (to 400, stops when it breaks) | `perf:breakpoint` | `perf:site:breakpoint` | `perf:live:breakpoint` 🔒 | `perf:live:site:breakpoint` 🔒 | up to 20 min |

```bash
npm run perf:site:smoke
```

- **Backend direct** measures the NestJS API alone. **Website** measures
  what a traveler really waits for (website → `/api` proxy → backend →
  database) and checks the CSP and the hidden backend on every answer.
- **Website on localhost: use a production build.** Stop `npm run dev`,
  then `npm run build` and `npm start` (port 3000). On `npm run dev` the
  pages are slower than the real site: the site smoke on 2026-11-21 gave
  pages 805 ms ✗ on the dev server and 702 ms ✓ on a production build,
  same code, same laptop.
- **🔒 Live heavy tests are locked.** They stop before the first request
  unless you add the agreement flag at the end. Only after the whole team
  has agreed, at a quiet time:

  ```bash
  npm run perf:live:site:stress -- -e LIVE_OK=yes
  ```

  Before a live stress, spike or soak, know what it does: it is real
  traffic on Vercel (it counts toward the project's usage), on the
  backend and on the hosted database (a 20-connection pool). Vercel's
  firewall may also start blocking one laptop that sends 100+ travelers'
  worth of requests, which shows as errors that are not the app's fault.
  Smoke and load on the live URLs need no flag, but the team still starts
  them.
- Results land in `performance/k6/results/` (git-ignored); live runs are
  named `live-*.json`.

Before you run anything, the team's backend must already be running on
port 5000. Don't start a second one. During a soak, keep the backend's
terminal open and watch for errors such as "too many connections".

### Reading the results

At the end, k6 prints a summary. Each threshold shows ✓ or ✗, and k6
exits with a failure code if any threshold failed. Look at:

| Line | Means | Good for us |
|------|-------|-------------|
| `http_req_duration ... p(95)=` | 95 % of answers were faster than this | Under 800 ms |
| `http_req_failed` | Share of failed requests | Under 1 % (load), under 5 % (stress) |
| `http_reqs` | Total requests and requests per second | Note it. It's your throughput |
| `checks` | Share of answers that were 200 and JSON | Over 99 % |
| `vus_max` | The most pretend travelers at once | The number you tested |

What to do with what you find:

- **Slow at low VU counts:** probably the database query. Check the route
  in `backend/src/v1/...` for a missing index or a query that loads too
  many rows, then use `/sql-change` to add an index.
- **Errors only above some VU count:** that number is your breaking
  point. Write it down. If it's below what you expect on demo day, treat
  it as a ticket.
- **Spike errors that don't stop afterwards:** the app didn't recover.
  This is more serious than errors during the spike itself.
- **Soak gets slower over time:** look for something that grows, like a
  cache that never empties, connections that are never released, or
  timers that are never cleared.
- **Cold starts:** the first requests to Vercel can be slower while a
  function starts up. Judge the "hold" part of the test, not the first
  seconds.

Write `docs/evaluations/YYYY-MM-DD-k6.md` with the test type, the target
(localhost or live), where it ran from, the VUs, p(95), the error rate,
✓/✗ for each threshold, and what you'll do next. Add
`performance/k6/results/` to `.gitignore`.

**Not covered by k6:** how fast a page *looks* to one person (that's
Lighthouse, `npm run perf:lighthouse`), anything behind a login, and writes. We deliberately don't
load-test writes on the hosted database.

**Later, not now:** load-testing the logged-in write routes would need a
separate test database, and running k6 in GitHub Actions would need CI.
Park both in `docs/LATER.md`.

## Page quality with Lighthouse (Core Web Vitals, accessibility, best practices, SEO)

**What Lighthouse is:** Google's free page checker, the same one inside
Chrome DevTools. It opens a page in a real (headless) Chrome, as **one
visitor**, and gives four scores from 0 to 100:

| Score | Checks… |
|-------|---------|
| **Performance** | how fast the page appears and becomes usable, including the **Core Web Vitals** below |
| **Accessibility** | missing labels, contrast, headings, alt text… (axe-core, like `e2e/a11y/`) |
| **Best practices** | the web-quality checks: HTTPS, no browser errors, no third-party cookies, safe libraries… |
| **SEO** | whether search engines can read the page: title, meta description, links… |

**Core Web Vitals** (Google's "good" limits, web.dev/vitals):

| Vital | Means | Good |
|-------|-------|------|
| **LCP**, Largest Contentful Paint | when the main content (usually the big photo or heading) has appeared | ≤ 2.5 s |
| **CLS**, Cumulative Layout Shift | how much the page jumps around while loading | ≤ 0.1 |
| **INP**, Interaction to Next Paint | how quickly the page reacts to a tap | ≤ 200 ms |

Lighthouse cannot measure INP without a real person tapping, so it reports
**TBT** (Total Blocking Time: how long the page was too busy to react) as
the lab stand-in, also with a 200 ms limit.

**How it differs from k6:** k6 asks "does the **backend** cope with many
travelers?" Lighthouse asks "how good is the **page** for one traveler?"

### Running

```bash
npm run perf:lighthouse
```

- **Default: the live site**, which is the real production build. It is
  read-only: about 6 page loads, like a visitor.
- **Phone and laptop:** each page is checked as a mid-range phone on slow
  4G (Lighthouse "mobile", what Google uses) and as a laptop ("desktop").
  Only one: `npm run perf:lighthouse -- DEVICES=mobile`.
- **Never trust speed scores from `npm run dev`:** dev code is not
  optimised. To check unpushed changes, stop `npm run dev`, run
  `npm run build`, then `npm start`, then
  `npm run perf:lighthouse -- BASE_URL=http://localhost:3000`.
  Accessibility, best practices and SEO are fine to check anywhere.
- Uses the installed Google Chrome. Takes about 2–4 minutes.
- **Shortcuts** (added 2026-11-21). Extra settings still go after `--`,
  for example `npm run perf:lighthouse:mobile -- PAGES=place`:

  | Command | Checks |
  |---------|--------|
  | `npm run perf:lighthouse` | live site, phone and laptop, home + place + log in |
  | `npm run perf:lighthouse:mobile` | live site, phone only |
  | `npm run perf:lighthouse:desktop` | live site, laptop only |
  | `npm run perf:lighthouse:local` | `localhost:3000`, phone and laptop (a production build: `npm run build` + `npm start`) |
  | `npm run perf:lighthouse:focus` | the evidence behind chosen audits (`focus.mjs`) |

- **Plug in the charger.** On battery the phone numbers come out 2–3×
  worse; the runner warns when the laptop's CPU score is under 2,000.
- Results: each check prints ✓ or ✗ against `budgets.mjs`, and lists the
  checks that pulled an accessibility, best-practices or SEO score down.
  The HTML reports are in `performance/lighthouse/reports/` (open them in
  a browser), with `summary.json` alongside.

### Reading the results

- **Phone first.** Google ranks with phone scores, and most travelers in
  Iloilo will be on a phone.
- A **performance** score moves a few points between runs (network, the
  machine). Judge LCP, CLS and TBT, and run twice before deciding.
- In each HTML report, "Diagnostics" and "Insights" name the cause:
  oversized images, render-blocking files, unused JavaScript, the LCP
  element and its "render delay".
- Write `docs/evaluations/YYYY-MM-DD-lighthouse.md`: the date, the URL,
  the scores per page and device, the vitals, and what to fix next.

**Not covered by Lighthouse:** real visitors' numbers (field data, which
needs many visits; Vercel Speed Insights can collect it), pages behind a
login, and anything under load (that's k6).

Coverage is a guide, not a goal: aim for the services and `src/lib/`
helpers to be well covered; do not chase 100 %.
