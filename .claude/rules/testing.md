---
paths:
  - "**/*.test.ts"
  - "**/*.test.tsx"
  - "**/*.spec.ts"
  - "test/**"
  - "backend/test/**"
  - "e2e/**"
  - "supabase/checks/**"
  - "security/**"
  - "performance/**"
  - "vitest.config.mts"
  - "playwright.config.ts"
---

# Testing rules

The full plan, tools and folder layout are in `docs/TESTING.md`. These
rules apply whenever test files are written or changed.

## Where a test goes

| Layer | File name and place | Runner |
|-------|---------------------|--------|
| Frontend unit | `src/**/name.test.ts`, next to the file | Vitest |
| Frontend component | `src/**/Name.test.tsx`, next to the component | Vitest + React Testing Library |
| Backend unit | `backend/src/**/name.spec.ts`, next to the file | Jest |
| Backend API | `backend/test/api/area.e2e-spec.ts` | Jest + supertest |
| Database / RLS | `supabase/checks/NN-name.sql` | Supabase SQL editor |
| End-to-end, a11y | `e2e/flows/`, `e2e/a11y/` | Playwright |
| Live smoke | `e2e/smoke/` | Playwright, `live` project |
| Security scan | `security/zap/*.yaml` (Automation Framework plans) | OWASP ZAP desktop app |
| Performance & load | `performance/k6/scenarios/{smoke,load,stress,spike,soak,breakpoint}.js` (backend), `site-{smoke,load,stress,spike,soak,breakpoint}.js` (website pages + `/api` proxy); every one has an `npm run perf:…` command, `perf:live:…` for the live URLs, shared code in `performance/k6/lib/` | Grafana k6 (local program) |
| Page quality (Core Web Vitals, accessibility, best practices, SEO) | `performance/lighthouse/run.mjs`, pass marks in `budgets.mjs` | Lighthouse (npm), with the installed Google Chrome |

- Shared data goes in `fixtures/`, pretend services in `fakes/` or
  `mocks/`, setup code in `helpers/`. Never copy sample data between test
  files.
- One test file per source file for unit tests; one file per user task
  for Playwright flows.

## Safety — non-negotiable

- **No test ever talks to the hosted Supabase project with write access.**
  Unit, component and API tests use fakes (`backend/test/fakes/`, MSW
  handlers). Never put a real Supabase URL, key or token in a test.
- **Never create accounts or type real passwords** in Playwright. Fake the
  login answer with `page.route()` (see `e2e/fixtures/test.ts`) and
  say in the test name that it is a pretend answer.
- **The one exception: `e2e/real-writes/`.** These tests save real data on
  the hosted database with the team's own dedicated test account. The team
  creates that account and puts it in `.env.test.local` (never committed;
  see `.env.test.example`). **The team runs them** (`npm run test:writes`),
  the agent never does. They run on localhost only, mark every text
  `[test …]`, and clean up after themselves, even when a step fails. A new
  real-write test needs the same safeguards.
- The live smoke project is **read-only**: it opens pages and checks text.
  It never clicks submit, save, delete or log in.
- `supabase/checks/*.sql` are `SELECT` only. No `INSERT`, `UPDATE`,
  `DELETE`, `ALTER` or `DROP` in that folder.
- No `service_role` or `sb_secret_` value anywhere in test code, fixtures
  or `.env.test`.
- Test tools never require Docker (no pgTAP, no Testcontainers, no ZAP
  Docker image. Use the ZAP desktop app). The only Docker use is the
  Supabase CLI's local stack, for `npx supabase db reset`.

## OWASP ZAP — security scans

- **Passive (baseline) scans only on the live URLs**
  (`lakat-iloilo.vercel.app`, `api-lakat-iloilo.vercel.app`). **Active
  scans only on `localhost`**, never on a Vercel URL.
- Every plan has `includePaths` limited to our own sites and excludes
  `supabase.co`. Never scan a site the team does not own.
- The DOM XSS rule needs ZAP to drive a browser. On Ubuntu, Firefox is a
  sandboxed snap that ZAP cannot drive, so every ZAP command passes
  `-config rules.domxss.browserid=chrome-headless` (needs Google Chrome).
- **Active scans run without a login.** The local backend writes to the
  hosted database, so ZAP must never get a real token or session cookie.
  After an active scan, check that no new rows appeared.
- The team starts every active scan themselves, after agreeing to it. The
  agent may write and explain plans but does not start an active scan.
- `security/zap/reports/` is git-ignored. Summaries go in
  `docs/evaluations/YYYY-MM-DD-zap.md`, with alerts counted by level.
- High and Medium alerts are fixed, or recorded as false positives with an
  `alertFilter` job and a comment saying why. Never hide an alert without
  a reason.

## Grafana k6 — performance and load tests

- **Every k6 test reaches the hosted Supabase database**, even on
  localhost. Treat k6 traffic as real traffic.
- **GET requests to public routes only.** No POST, PATCH, PUT or DELETE,
  no login, no token, no cookie. Routes come from
  `performance/k6/lib/routes.js` and must exist in `docs/SPEC.md`. Place
  ids are UUIDs, so they're looked up in `setup()`
  (`performance/k6/lib/traveler.js`), never typed into a route.
- Never send k6 traffic to `*.supabase.co` or to any site the team does
  not own.
- **Smoke and load** may run on localhost or the live API.
  **Stress, spike, soak and breakpoint** run on localhost by default. Each one calls
  `guardHeavyTest()`, which refuses any address other than localhost unless
  `-e LIVE_OK=yes` is passed. The team passes it, after agreeing, never the
  agent.
- The agent may run `perf:smoke` and `perf:site:smoke` against localhost
  to check that a script works. Security checks in the site scenarios are
  tagged `security:yes` and must pass 100 %: never lower that. The team starts load, stress, spike, soak and breakpoint tests, and every
  test on the live URL.
- Always run smoke before any bigger test. If smoke fails, fix the script
  first.
- Thresholds live in `performance/k6/lib/thresholds.js` and are shared.
  Stress and spike add `abortOnFail` so k6 stops once the app is clearly
  failing. Never loosen a threshold just to get a ✓. If a limit is wrong,
  agree the new number with the team and write down why.
- Every iteration ends with `sleep()` (1–3 s) so a virtual user behaves
  like a person reading a page.
- Tag requests by route without the query string
  (`tags: { name: '/v1/destinations/near' }`) so the summary groups them.
- No Grafana Cloud and no paid k6 features. The local `k6 run` is enough.
- `performance/k6/results/` is git-ignored. Summaries go in
  `docs/evaluations/YYYY-MM-DD-k6.md`: the type, the target, where it ran
  from, the VUs, p(95), the error rate and ✓/✗ for each threshold.

## Lighthouse — page speed, accessibility, web quality

- **Read-only, so the agent may run it**, on the live site or localhost.
  It only opens pages, like one visitor (`npm run perf:lighthouse`).
- **Speed scores only count from a production build:** the live site, or
  `npm run build` + `npm start`. Never judge Performance or Core Web
  Vitals from `npm run dev`; the runner prints a warning for it.
  Accessibility, best practices and SEO are fine anywhere.
- **Phone first.** Report the `mobile` result before `desktop`: Google
  ranks with it, and most travelers use a phone.
- Pass marks in `performance/lighthouse/budgets.mjs` are Google's
  published "good" limits: scores ≥ 90, LCP ≤ 2.5 s, CLS ≤ 0.1, TBT
  ≤ 200 ms (the lab stand-in for INP). Never lower one to get a ✓. If one
  is wrong for this app, agree the change with the team and write why.
- Performance moves a few points between runs: run twice before calling
  something a regression, and judge the vitals rather than the score.
- Name the cause from the report ("Insights", "Diagnostics", the LCP
  element and its breakdown), not only the score. For example: "the
  home intro text is the LCP and waits 2.5 s to fade in".
- `performance/lighthouse/reports/` is git-ignored. Summaries go in
  `docs/evaluations/YYYY-MM-DD-lighthouse.md`.

## How tests are written

- Name tests as a sentence about behaviour:
  `it('refuses a traveler on an admin route with 403')`, not
  `it('works')`.
- Arrange → Act → Assert, with a blank line between each part.
- Frontend: find elements the way a person does — `getByRole`,
  `getByLabelText`, `getByText`. Avoid `getByTestId` unless nothing else
  fits; never select by CSS class.
- Backend unit: build the module with `Test.createTestingModule` and
  replace repositories with `{ provide: getRepositoryToken(Entity), useValue: fake }`
  and `SupabaseService` with the fake.
- Every new endpoint gets API tests for: the happy path, no login (401),
  wrong role (403), bad input or id (400), missing row (404).
- Every bug fix gets a test that fails before the fix and passes after.
- Async Server Components cannot be rendered in Vitest — cover those pages
  with a Playwright flow instead.
- No fixed waits (`waitForTimeout`, `setTimeout`). Use Playwright's
  auto-waiting `expect(...).toBeVisible()`.
- Playwright flows run at a phone width (375 px) and a laptop width
  (1280 px).

## Running

- Backend: `npm run test` and `npm run test:api` inside `backend/`. These
  do not touch `dist/` and are safe while `nest start --watch` runs.
- Frontend: `npm run test` at the root.
- Playwright: `npm run test:e2e` expects the team's dev servers already
  running; never start a second backend on port 5000.
- If a test fails twice the same way, stop and explain — do not loosen
  the assertion to make it pass.
