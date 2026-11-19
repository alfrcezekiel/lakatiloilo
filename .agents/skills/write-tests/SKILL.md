---
name: write-tests
description: Adds tests for a ticket, file or bug at the right layer (unit, component, API, RLS check, end-to-end, accessibility, live smoke, OWASP ZAP security scan, Grafana k6 load/stress/spike/soak test, Lighthouse page speed / Core Web Vitals / accessibility / best practices / SEO) following docs/TESTING.md and .Codex/rules/testing.md, runs them, and explains the result in plain English. Use when the team says "write tests for…", "test this ticket", "add a regression test", or after a bug fix.
disable-model-invocation: true
---

Tests prove the app keeps working after the next change. Pick the
**lowest layer that can catch the problem** — it is faster and points at
the exact broken line.

## 0. Check the setup

1. Read `docs/TESTING.md` and `.Codex/rules/testing.md`.
2. Check the runner for the layer is installed (`vitest`, `jest`,
   `supertest`, `@playwright/test`, `@axe-core/playwright` in the matching
   `package.json`). If it is missing, **stop**: name the packages, say
   they are development-only and free, and wait for the team to agree
   before installing. For a security scan, check that the team has the
   OWASP ZAP desktop app (never the Docker image). For a performance
   test, check that `k6 version` works. If it doesn't, give the install
   command from `docs/TESTING.md` and wait. For Lighthouse, check that
   `lighthouse` is in `package.json` and that Google Chrome is installed.

## 1. Choose the layer

Ask what could go wrong, then pick:

| If the risk is… | Layer | Where |
|-----------------|-------|-------|
| A helper or service gives a wrong answer | Unit | next to the file |
| A screen shows the wrong thing, or is not keyboard-usable | Component | next to the component |
| A route lets the wrong person in, or returns the wrong code | API | `backend/test/api/` |
| A table is readable by anyone | RLS check | `supabase/checks/` |
| A whole task breaks across pages | End-to-end | `e2e/flows/` |
| Contrast, labels, focus | Accessibility | `e2e/a11y/` |
| The deploy is broken | Live smoke | `e2e/smoke/` |
| Missing security headers, unsafe cookies, open CORS, injection | Security scan (OWASP ZAP) | `security/zap/` |

| Slow or failing when many travelers arrive at once | Performance (k6) | `performance/k6/scenarios/` |
| A page is slow to appear, jumps around, or is hard to use or find for one visitor | Page quality (Lighthouse) | `performance/lighthouse/` |

Run a ZAP scan after a round of tickets, before a demo, or when a ticket
adds a route, a cookie, a form or a header.

For performance, pick the k6 test type from the team's question:

| The team asks… | Test type |
|----------------|-----------|
| "Does the script work?" / before anything else | `smoke.js` |
| "Is it OK on demo day?" | `load.js` |
| "How many users can it take?" | `stress.js` |
| "What if a post goes viral?" | `spike.js` |
| "Does it slow down if it runs all day?" | `soak.js` |

A new public GET route goes in `performance/k6/lib/routes.js` with a
weight. Change `lib/` once instead of copying code into the scenarios.

A ticket usually needs one unit or API test per acceptance criterion and
at most one Playwright flow.

## 2. Write the tests

- List the cases first, as sentences, and show the team the list.
- Happy path, then the refusals and edge cases (empty list, very long
  text, missing photo, Filipino place names with ñ and accents).
- Reuse `fixtures/`, `fakes/`, `mocks/` and `helpers/`; add to them
  instead of inventing data inside the test.
- For a bug fix: write the test first, run it, and show that it **fails**
  for the reason the bug describes. Then fix, and show it passes.
- Follow every safety rule in `.Codex/rules/testing.md` (no hosted
  Supabase writes, no real logins, read-only smoke and SQL checks).

## 3. Run them

- Backend: `npm run test` or `npm run test:api` in `backend/`.
- Frontend: `npm run test` at the root.
- Playwright: `npm run test:e2e` (dev servers must already be running) or
  `npm run test:smoke` for the live URL.
- SQL checks: give the team the file to paste into the Supabase SQL
  editor and say what result means "safe" (usually: zero rows).
- ZAP: the team runs the plan from the ZAP app (*Automation* tab → Load
  plan → Run). Give them the steps from `docs/TESTING.md`.
  - `baseline-live.yaml` (passive) is safe on the live URLs at any time.
  - `active-local.yaml` attacks localhost only, with no login. Before
    they start it, remind them that the local backend writes to the
    hosted database. Afterwards, ask them to check that no new rows
    appeared.
  - Never start an active scan yourself, and never put a token or
    cookie in a plan.

- k6: follow the k6 rules in `.Codex/rules/testing.md`.
  - You may run `npm run perf:smoke` (localhost) to prove a script works.
  - Hand the team the command for load, stress, spike and soak. Say how
    long it takes, how many virtual users it reaches, and that it hits the
    hosted database.
  - Never pass `-e LIVE_OK=yes` yourself.

- Lighthouse: `npm run perf:lighthouse` (live site by default, about
  2–4 minutes, read-only, so you may run it yourself). For unpushed
  changes, use a production build (`npm run build` + `npm start`), then
  add `-- BASE_URL=http://localhost:3000`; never judge speed on
  `npm run dev`. A new important page goes in the `PAGES` list in
  `run.mjs`.

## 3b. Read a Lighthouse result

1. One sentence: which pages and devices met every budget, and which did
   not. Phone first.
2. A table per page and device: the four scores, and LCP, CLS and TBT
   with ✓/✗.
3. For each ✗, the cause from the HTML report in plain words: the LCP
   element and where its time went (load delay, render delay), oversized
   images ("Improve image delivery"), main-thread work, the failing
   accessibility, best-practices or SEO checks by name.
4. Say what is ours to fix and what is not. For example, Wikimedia's
   cookies on its photos lower Best Practices, but are set by Wikimedia.
5. Write `docs/evaluations/YYYY-MM-DD-lighthouse.md`.

## 3c. Read a k6 summary

When the team pastes the summary, or shares `performance/k6/results/*.json`:

1. One sentence: passed or failed, at how many VUs.
2. A small table with p(95), the error rate, requests per second and ✓/✗
   for each threshold, plus the slowest route (from the `name` tags).
3. In plain words, what it means for a traveler on demo day.
4. A likely cause and the next step: a database index (`/sql-change`), a
   query that loads too much, cold starts, or nothing to fix.
5. Write `docs/evaluations/YYYY-MM-DD-k6.md`, and ask before saving.

## 3d. Read a ZAP report

When the team shares the report (HTML in `security/zap/reports/`):

1. Count the alerts by level (High, Medium, Low, Informational).
2. For each High or Medium alert, explain in plain words what it means
   for a traveler or an admin. Name the file that causes it and the fix,
   or say why it is a false alarm. Content-Security-Policy is a known,
   parked item.
3. Write `docs/evaluations/YYYY-MM-DD-zap.md` with the counts, the
   fixes, and what was accepted and why.
4. If a fix is needed, treat it as a ticket. Re-run the same plan
   afterwards to show the alert is gone.

## 4. Report

In plain English, following `.Codex/rules/working-with-the-team.md`:

1. One sentence: how many tests, at which layer, all passing or not.
2. The files added, as links.
3. What the tests check and what they do **not** check.
4. Anything that failed, with the real error message, and what you think
   is wrong.

Do not commit. Wait for the team to say "commit and push" (then use
`/ship`).
