# AGENTS.md — Lakat Iloilo

Instructions for **any** AI coding agent working in this repository
(Claude Code, Codex, Cursor, Copilot, Gemini, Devin, …). Claude Code also
reads `CLAUDE.md` and `.claude/`; other agents should treat this file as
the entry point and follow the links from here.

## 1. The project in one minute

- **What:** Lakat Iloilo, a tourism site where travelers browse
  destinations and accommodations in Iloilo and leave reviews (stars,
  comment, photo, likes, threaded replies, reports, live updates).
- **Frontend:** Next.js (App Router) + TypeScript + Tailwind, in `src/`.
  Live at https://lakat-iloilo.vercel.app/
- **Backend:** NestJS in `backend/`, with TypeORM. Live at
  https://api-lakat-iloilo.vercel.app — locally `http://localhost:5000`.
- **Database / auth / storage:** a hosted Supabase project (never local).
- **What we are building:** `docs/SPEC.md` (the endpoint list is in
  "API Endpoints"). Work items: `docs/tickets/NN-*.md`.

## 2. Rules every agent must follow

These are summaries. The full text wins: `CLAUDE.md`,
`.claude/rules/working-with-the-team.md`, and the path-scoped rules
`.claude/rules/frontend.md` (`src/**`), `backend.md` (`backend/**`),
`database.md` (`supabase/**`) and `testing.md` (test files, `e2e/**`,
`security/**`, `performance/**`).

1. **Pinned stack.** No new framework, database, host, CSS library, paid
   service, or Docker. Ask the team first if you think one is needed.
2. **No spec, no code.** Feature work needs `docs/SPEC.md` and a ticket.
3. **Security baseline.** Row Level Security on every table with explicit
   policies. The `service_role` key and any `sb_secret_` key never appear
   in this repo. Only `NEXT_PUBLIC_` Supabase URL + publishable key reach
   the browser. `.env`, `.env.local` and `backend/.env` are never
   committed.
4. **Commit and push only when the team asks**, and only the files they
   named. Pushing to `main` deploys to the live URL.
5. **Never create accounts or type real passwords** on the hosted
   Supabase project. Never run SQL on it yourself — write the file in
   `supabase/sql/`, and the team runs it.
6. **Backend dev server:** the team keeps `nest start --watch` on port
   5000. Do not start a second one and do not run `npm run build` in
   `backend/` (it deletes `dist/`). Use `npx tsc --noEmit -p tsconfig.json`.
7. **Teach as you go.** Plain English, define jargon once, two or three
   sentences after each change. Commands must work in PowerShell and Git
   Bash.
8. **Same error twice → stop** and explain instead of trying a third
   variation.
9. Ignore `npm audit` warnings from the eslint toolchain.
10. **Testing is safe by default.** Tests use fakes, never real Supabase
    keys, tokens or accounts. OWASP ZAP's active scan runs on localhost
    only. Grafana k6 sends public GET requests only. Stress, spike and
    soak tests run on localhost unless the team agrees, and the team
    starts them. Full rules: `.claude/rules/testing.md`.

## 3. Skills catalogue

A **skill** is a written procedure an agent follows for one kind of task.
In Claude Code they are slash commands stored in `.claude/skills/<name>/SKILL.md`.
Other agents: when the team says "run /<name>" (or describes that task),
open that file and follow it step by step.

### Workflow skills (in order of use)

| Skill | File | What it does | Produces |
|---|---|---|---|
| `/grill-with-docs` | `.claude/skills/grill-with-docs/SKILL.md` | A sceptical product-manager interview that tests whether the problem is real and cuts the idea down to an MVP. Writes no code. | `docs/PROBLEM.md` |
| `/pitch` | `.claude/skills/pitch/SKILL.md` | Turns PROBLEM.md into a ~400-word, three-minute spoken pitch plus the hardest likely questions. | `docs/PITCH.md` |
| `/to-spec` | `.claude/skills/to-spec/SKILL.md` | Synthesises a small, buildable spec (screens, data, endpoints, "done for the demo") without re-interviewing. | `docs/SPEC.md` |
| `/to-tickets` | `.claude/skills/to-tickets/SKILL.md` | Breaks the spec into vertical-slice tickets of 20–40 minutes, starting with "Live on Vercel". | `docs/tickets/NN-*.md` |
| `/implement` | `.claude/skills/implement/SKILL.md` | Builds one ticket at a time inside the pinned stack, checks the build, explains the change. | code |
| `/code-review` | `.claude/skills/code-review/SKILL.md` | Reviews a diff on two separate axes: **Spec** (did it do what was asked?) and **Safety & Standards** (is it secure and sensible?). | review report |

### Project helper skills

| Skill | File | What it does |
|---|---|---|
| `/new-endpoint` | `.claude/skills/new-endpoint/SKILL.md` | Adds one NestJS endpoint end to end: contract first, controller validation, service (TypeORM read or `asTraveler` write), CORS, a function in `src/lib/api.ts`, a spec line, then `curl` tests. |
| `/sql-change` | `.claude/skills/sql-change/SKILL.md` | Writes the next numbered `supabase/sql/NNN-*.sql` file with RLS, policies, grants and check queries, and walks the team through running it. |
| `/responsive-check` | `.claude/skills/responsive-check/SKILL.md` | Measures an element with `getBoundingClientRect()` at 375/640/768/1024/1440 px, finds why it is squeezed or overflowing, fixes it and re-measures. |
| `/ship` | `.claude/skills/ship/SKILL.md` | Safe commit: stages only the named files, checks for secrets, runs type-check/lint/build, writes the message, pushes to `main`. |
| `/live-check` | `.claude/skills/live-check/SKILL.md` | Turns a ticket's acceptance criteria into a numbered test for the team on the live URL, then records their results. |
| `/write-tests` | `.claude/skills/write-tests/SKILL.md` | Picks the lowest test layer that can catch the risk (unit, component, API, RLS check, end-to-end, accessibility, live smoke, ZAP security scan, or k6 load/stress/spike/soak), writes the tests, runs the safe ones, and reports in plain English. |
| `/evaluate-app` | `.claude/skills/evaluate-app/SKILL.md` (procedure: **this file, section 4**) | Full evaluation of UI/UX, workflows, API, middleware, functions, end-to-end flows and accessibility, or one part of it: `/evaluate-app api`, `/evaluate-app a11y /login`, `/evaluate-app e2e reviews live`, `/evaluate-app 93`. Produces a graded, read-only report. |

## 3a. Testing architecture

The full strategy is in `docs/TESTING.md`: the pyramid, why each tool
was chosen, the folder layout, scripts, and example ZAP plans and k6
scripts. The tools are **proposed**. None is installed yet, and the team
agrees before any is added. All are free, and none needs Docker.

```
 8  Performance & load   Grafana k6         performance/k6/   load · stress · spike · soak
 7  Security scan        OWASP ZAP          security/zap/     passive live · active localhost
 6  Live smoke           Playwright         e2e/smoke/        read-only, live URL
 5  End-to-end + a11y    Playwright + axe   e2e/flows/, e2e/a11y/
 4  Database / RLS       SQL checks         supabase/checks/  read-only
 3  API integration      Jest + supertest   backend/test/api/
 2  Component            Vitest + RTL + MSW next to the component
 1  Unit                 Vitest / Jest      next to the file
 0  Static checks        tsc + ESLint       (in place)
```

**How the folders are laid out:**

- Unit and component tests sit next to the file they test.
- Tests that span many files get a top-level folder (`backend/test/`,
  `e2e/`).
- The file name says the runner: `*.test.ts(x)` is Vitest, `*.spec.ts`
  is Jest (unit), `*.e2e-spec.ts` is Jest (API), `e2e/**/*.spec.ts` is
  Playwright.
- `fixtures/` holds sample data, `fakes/` and `mocks/` hold pretend
  services, and `helpers/` holds setup code.
- Raw ZAP reports and k6 results are git-ignored. Summaries go in
  `docs/evaluations/`.

**The four k6 test types** use the same public GET routes
(`performance/k6/lib/routes.js`) and thresholds (p(95) under 800 ms,
errors under 1 %). Only the traffic shape changes:

| Type | Shape | Where |
|------|-------|-------|
| Load | ramp to 20 virtual users, hold 5 min | localhost or live |
| Stress | steps of 20 → 50 → 100 → 150, stops at 5 % errors | localhost (live needs `-e LIVE_OK=yes` and the team's OK) |
| Spike | 5 → 100 in 10 s, back to 5, watch recovery | localhost (same) |
| Soak | 20 for 30–60 min | localhost (same) |

A 30-second smoke run comes before each of them. Agents may run the
smoke test on localhost. The team runs everything else.

**How it connects to `/evaluate-app`:** that skill is a read-only audit
done by hand. The test layers turn its findings into checks that can be
run again. When an evaluation finds a bug, `/write-tests` adds a test
that fails before the fix and passes after it.

## 4. Skill: `/evaluate-app` — evaluate the whole application

**Use when:** before a demo, after a round of tickets, when the team asks
"is it good?", "test everything", "check accessibility", or "audit the
app". It can also be pointed at one area ("evaluate the review flow").

**Narrowing it:** the team can name an area, page, workflow, ticket or
"live" after the command. The mapping from request to phases is in
`.claude/skills/evaluate-app/SKILL.md`, section 1; agents without slash
commands should use that table too.

**This skill is read-only by default.** It reports; it does not fix. At
the end, offer to fix findings one at a time (each fix then follows
`/implement` habits, and is committed only when the team asks).

### 4.0 Skills and techniques this skill reuses

So the method stays consistent with the rest of the project, each phase
borrows from an existing skill instead of inventing a new procedure:

| Phase | Reuses | Why |
|---|---|---|
| Scope | `/to-spec`, `/to-tickets` outputs | The spec and tickets define "correct". We test against them, not against taste. |
| Static checks | `/ship` step 4 | Same type-check, lint and build commands Vercel runs. |
| API & middleware | `/new-endpoint` contract format + `curl` tests | Every endpoint is judged by its documented status codes and messages. |
| Database / RLS | `/sql-change` check queries, `database.md` | Proves "a stranger cannot edit this" without writing data. |
| Code quality & security | `/code-review` two-axis method | Spec findings and Safety findings stay in separate lists. |
| Responsive | `/responsive-check` | Measure with JavaScript, never trust a screenshot alone. |
| End-to-end & hand-off | `/live-check` | The team, not the agent, confirms results on the live URL. |

### 4.1 Agree the scope (ask, then wait)

1. Read `docs/SPEC.md`, the tickets the team names (or the latest
   round), `CLAUDE.md` and the three path rules.
2. Propose, in one short block:
   - **Target:** `http://localhost:3000` + `http://localhost:5000`, or the
     live URLs. Default: localhost for deep checks, live URL for the
     final pass.
   - **Areas:** all eight phases below, or the ones named.
   - **Workflows** to walk end to end (default list in 4.6).
3. Confirm before starting. Check the dev servers are already running
   (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/v1/destinations`);
   if not, ask the team to start them rather than starting a second copy.

### 4.2 Static checks (functions and types)

Run and record pass/fail with the first error of each:

```bash
npx tsc --noEmit
npm run lint
npm run build
cd backend && npx tsc --noEmit -p tsconfig.json
```

Then read the core functions and check each against its comment and the
spec. Name the file and line for anything that disagrees.

- `src/lib/api.ts` — every backend call; `/api` in the browser (the proxy in
  `src/app/api/[...path]/route.ts`), server-only `API_URL` on the server;
  writes send `Authorization: Bearer` from `loginToken()`; errors go
  through `backendMessage()` with the fallback sentence.
- `src/lib/auth.ts`, `src/lib/login.ts` — login storage, renewal timer,
  one-tab lock, retries, log-out in every tab.
- `src/lib/realtime.ts` — "doorbell only": never uses the row Realtime
  sends, never subscribes to `review_reports`, cleans up its channel.
- `backend/src/v1/login-token.ts`, `traveler-transactions.ts`
  (`asTraveler`), `near-query.ts` — parameters (`$1`), never string-glued
  SQL; one transaction per traveler write.
- Edge cases to reason through for each function: empty input, missing
  login, expired login, double-click / repeated call, network failure,
  very long text, non-Latin text, a deleted row.

### 4.3 API evaluation

Build a table from the spec's "API Endpoints" section — one row per
endpoint — then test each with `curl` (works in Git Bash; in PowerShell
use `curl.exe`). **Without a login you may only test reads and the
refusal cases.** Do not send a successful write to the hosted database
unless the team gives you a test token for their own test account and
says so.

For every endpoint check:

| Check | How |
|---|---|
| Happy path (reads) | `curl -s -w "\n%{http_code}\n" $API/v1/destinations` → 200, JSON shape matches the spec |
| Not logged in | write without `Authorization` → **401** "Please log in, then try again." |
| Fake login | `-H "Authorization: Bearer fake"` → 401, plain message, no stack trace |
| Bad id / unknown row | `/v1/destinations/999999`, `/v1/travelers/<random uuid>` → **404** with the spec's sentence |
| Bad input | wrong types, out-of-range stars, 301-char reply, wrong `place_type` → **400** with a "Please …" sentence |
| Injection-shaped input | `?category=' or 1=1--` → normal 200/400, never 500, never extra rows |
| Spatial query | `/near?lat=10.72&lng=122.56&radius_km=5` → sorted, within radius; missing `lat` → 400 |
| Privacy | no endpoint answers an email except `/v1/auth/me` for yourself; no password, token or `service_role` in any answer |
| Error hygiene | no 500s; messages are friendly sentences the website can show as they are |
| Speed | `-w "%{time_total}"`: note anything over ~1 s locally |

Report as a table: endpoint → expected → got (status + message) → ✅/❌.

### 4.4 Middleware evaluation

In this project "middleware" is everything a request passes through
before the handler runs. The website has one Next.js proxy,
`src/proxy.ts` (since ticket 107): admin pages answer "not found" (404)
unless the request carries an admin's login; the backend decides. Check
it answers 404 logged out and as a traveler. Do not add another.

- **CORS** (`backend/src/main.ts`, `app-setup.ts`): since tickets 151–153
  no browser calls the backend (the website's `/api` proxy does, server to
  server), so `CORS_ORIGIN` is normally unset and CORS is off: no origin,
  not even the website's own, gets `Access-Control-Allow-Origin`
  (code review 2026-11-20). If `CORS_ORIGIN` is set, an allowed origin gets
  the header and another origin does not.
  ```bash
  curl -s -i -X OPTIONS $API/v1/reviews -H "Origin: https://lakat-iloilo.vercel.app" -H "Access-Control-Request-Method: POST" | grep -i access-control
  curl -s -i -X OPTIONS $API/v1/reviews -H "Origin: https://evil.example" -H "Access-Control-Request-Method: POST" | grep -i access-control
  ```
  Methods should be exactly GET, POST, PUT, PATCH, DELETE (PUT since
  ticket 132, for photo credits); headers Content-Type and
  Authorization, when `CORS_ORIGIN` is set. Unset (the normal case since
  ticket 152) means CORS off; it no longer stops the backend starting.
- **Auth guard** (`loginToken` + Supabase token check): every write
  endpoint calls it; read endpoints that show `liked_by_me` still work
  without a login.
- **Act-as-traveler** (`asTraveler`): every write sets
  `request.jwt.claims` and `set local role authenticated` inside one
  transaction, so RLS decides. Any write that bypasses it is a
  **Critical** finding.
- **Validation** in controllers: every body field validated with a
  friendly message; `@HttpCode` set on purpose.
- **Next.js wrappers**: `src/app/layout.tsx`, `template.tsx`
  (opacity-only fade, `motion-safe:`), `Providers.tsx` (TanStack Query).
- **Security headers** on the live site: note whether
  `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`
  and `Strict-Transport-Security` are present (`curl -sI <url>`).
  Missing ones are Low findings, park-able in `docs/LATER.md`.

### 4.5 Database and RLS (read-only)

- List tables and their RLS state from the newest `supabase/sql/` files
  and confirm each table has `enable row level security` plus a policy
  per action.
- Grants: travelers may write only the columns they own.
- Do **not** query the hosted database yourself. If proof is needed,
  write the check queries (with `begin; … rollback;`, per `database.md`)
  and hand them to the team.
- Secret scan of the repo:
  ```bash
  git grep -nE "sb_secret_[A-Za-z0-9_-]{10,}|eyJ[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}"
  git ls-files | grep -E "(^|/)\.env(\.local)?$"
  ```
  Both should print nothing. The first looks for real key *values* (an
  `sb_secret_…` key or a JWT); comments that merely say "never use the
  service_role key" are fine. If a JWT turns up, decode its middle part
  and check whether `"role"` is `service_role` (Critical) or `anon`.

### 4.6 End-to-end workflows

Walk each workflow in a real browser (Claude in Chrome, the built-in
browser, Playwright MCP, or whatever browser tool your agent has). Record
for every step: what you did, what you saw, network calls with status
codes, and console errors. Hard refresh (Ctrl+Shift+R) before each.

Default workflows from the spec:

1. **Browse:** home → category chips → search → destination detail →
   accommodation detail → back. Ratings and "No reviews yet" correct.
2. **Nearby:** a `/near` result list shows and is sensible.
3. **Sign up / log in / log out:** *fake the backend's answer* (intercept
   the request and return a pretend response) — never a real account.
   Say clearly in the report that these were pretend answers. Check
   wrong-password and "already exists" messages too.
4. **Write a review** (logged-out path): the form asks you to log in.
   Logged-in path only with the team's test account, or with faked
   answers.
5. **Edit / delete own review, photo add/remove, like, reply, threaded
   reply, report:** check each button's states (idle, busy, success,
   error) and that the message shown is the backend's own sentence.
6. **Traveler profile:** `/travelers/[id]` shows reviews, no email;
   unknown id shows the friendly 404.
7. **Forgot / reset password:** pages load, validation messages show;
   do not send real reset emails without the team's say-so.
8. **Live updates:** with two tabs open, a change signalled in one
   refreshes the other (team-run if it needs a real write); after the
   tab sleeps or loses connection it catches up.

Then repeat workflows 1 and 4 on the **live URL** and hand the team a
numbered `/live-check`-style test for anything you could not do yourself.

### 4.7 UI/UX evaluation

Score each screen against these heuristics (Nielsen's ten, made
concrete for this app). For every problem: screen, what you saw, why it
hurts the traveler, suggested fix.

- **Status is visible:** loading skeletons (`PlaceListSkeleton`,
  `DetailPageSkeleton`), busy buttons disabled, `role="status"` lines
  after small changes, `StatusModal` for big outcomes.
- **Speaks the traveler's language:** friendly complete sentences that
  say what to do next; no codes or jargon on screen.
- **Control and freedom:** cancel on edit, confirm before delete, back
  button works, nothing lost on accidental navigation.
- **Consistency:** same `src/components/ui/` Button/Card/Input
  everywhere; same icon set (Lucide); same wording for the same action.
- **Error prevention:** limits shown before submit (300 characters,
  2 MB photo, JPG/PNG/WebP), password strength, no double submit.
- **Recognition over recall:** current page clear in `DockNavbar`, who
  is logged in visible in `ProfileMenu`.
- **Minimalist design:** the core job (find a place, read and write
  reviews) is not buried; demoable in three minutes.
- **Recovery from errors:** every failure has a message and a way out.
- **Performance felt by the user:** note slow first paint, layout
  shift, images without sizes, animation jank.
- **Responsive:** follow `/responsive-check` at 375, 768, 1024, 1440 px;
  `document.documentElement.scrollWidth <= innerWidth` on every page.

### 4.8 Accessibility evaluation (WCAG 2.2 level AA)

Check every page and every modal or menu. Measure where you can.

| Area | What to check |
|---|---|
| Keyboard | Tab through the whole page: every control reachable, order follows the screen, no keyboard trap, Esc closes `StatusModal`/menus, Enter/Space activate buttons. |
| Focus | Visible focus ring on every control (not removed by `outline-none` without a replacement); focus moves into a modal and returns to its trigger when it closes. |
| Names and roles | Every button, link, input and icon-only control has an accessible name (`aria-label` or visible text); inputs use `<Label htmlFor>`; links vs buttons used correctly. |
| Structure | One `<h1>` per page, headings in order, `<main>`, `<nav>`, `<footer>` landmarks, `lang` on `<html>`. |
| Images | Meaningful images have `alt` that says what they show; decorative ones `alt=""`; review photos have alt text. |
| Colour and contrast | Text ≥ 4.5:1 (large text ≥ 3:1), UI parts and focus rings ≥ 3:1 — especially text on glass/blur backgrounds (`GlassField`, hero). Information never by colour alone (stars, password strength). |
| Forms and errors | Errors linked with `aria-describedby`, announced (`role="alert"` or `aria-live`), say how to fix; required fields marked. |
| Dynamic updates | Live updates, likes and "deleted" messages announced with `aria-live="polite"` without stealing focus. |
| Motion | Everything animated respects `prefers-reduced-motion` (`motion-safe:`, Motion's reduced-motion setting); nothing flashes. |
| Zoom and reflow | At 200% zoom and at 320 px wide, no sideways scroll and no cut-off text. |
| Targets | Touch targets at least 24×24 px (aim for 44×44 on phones). |

Tools, in order of preference (no new project dependencies):

1. Browser DevTools → Lighthouse → Accessibility, and the Accessibility
   tree panel.
2. A one-off axe-core run in the page's console, not added to the
   project:
   ```js
   const s = document.createElement('script');
   s.src = 'https://cdnjs.cloudflare.com/ajax/libs/axe-core/4.10.2/axe.min.js';
   s.onload = () => axe.run().then(r => console.table(r.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length }))));
   document.head.appendChild(s);
   ```
3. Manual keyboard and screen-reader pass (NVDA on Windows, VoiceOver on
   Mac/iPhone, TalkBack on Android) for the review workflow.

Automated tools find roughly a third of problems; the keyboard pass is
not optional.

### 4.9 The report

Save to `docs/evaluations/YYYY-MM-DD.md` (ask before saving) and summarise
in chat. Lead with the outcome in one sentence.

```markdown
# Evaluation — YYYY-MM-DD
**Target:** localhost / live · **Scope:** … · **Spec version:** latest round

## Verdict
One sentence: ready to demo / ready with N fixes / not ready, and why.

## Scorecard
| Area | Result | Critical | High | Medium | Low |
|---|---|---|---|---|---|
| Static checks | ✅/❌ | | | | |
| Functions | | | | | |
| API | | | | | |
| Middleware | | | | | |
| Database / RLS | | | | | |
| End-to-end | | | | | |
| UI/UX | | | | | |
| Accessibility | | | | | |

## Findings
Separate lists, as in /code-review:
### A. Spec (does it do what SPEC.md and the tickets say?)
### B. Safety, standards, UX and accessibility
Each finding:
- **[Severity] Title** — `file:line` or page + step
  - What happens (and how it was checked: curl / browser / reading code)
  - Root cause in plain words
  - Suggested fix (smallest change inside the pinned stack)
  - WCAG criterion, if accessibility (e.g. 2.4.7 Focus Visible)

## What was checked, how, and what was NOT checked
Be explicit: pretend answers used for login, writes not tested on the
hosted database, screen reader not run, etc.

## For the team to test
Numbered /live-check-style steps for everything only they can confirm.

## Parked
Ideas that are new scope → offer to add to docs/LATER.md.
```

**Severity:** **Critical** — data exposure, a write that bypasses RLS,
a leaked secret, the core workflow broken. **High** — a spec'd feature
does not work, keyboard users cannot complete the core job, a 500 error.
**Medium** — confusing UX, missing or wrong message, contrast failure,
broken at one width. **Low** — polish, missing security header, nice to
have.

### 4.10 After the report

- Do not fix anything until the team picks findings. Fix one at a time,
  explain each fix in two or three sentences, re-run the check that
  found it, and wait for "commit and push".
- New ideas that are not in the spec are scope: name them and offer
  `docs/LATER.md`.
- Tick ticket boxes only after the team confirms.
