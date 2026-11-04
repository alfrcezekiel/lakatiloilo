---
name: evaluate-app
description: Evaluates the Lakat Iloilo app — UI/UX, end-to-end workflows, the NestJS API, middleware (CORS, login check, act-as-traveler), functions, the database's RLS and accessibility (WCAG 2.2 AA) — and writes a graded, read-only report. Takes an optional focus, for example "/evaluate-app api", "/evaluate-app accessibility on the login page" or "/evaluate-app the review workflow on the live URL". Use before a demo, after a round of tickets, or when the team asks to test, audit or check accessibility.
argument-hint: "[area or instruction, e.g. api | middleware | a11y /login | e2e reviews | live]"
---

The full procedure lives in `AGENTS.md`, section 4, so every AI agent
uses the same one. **Read `AGENTS.md` section 4 now** and follow it. This
file only says how to narrow it to the team's request.

**Read-only.** Report, don't fix. Never create an account, type a real
password, send a successful write to the hosted database, or run SQL on
it. Commit nothing unless the team says "commit and push".

## 1. Read the request

The team's instruction: **$ARGUMENTS**

- **Empty:** a full evaluation. Propose the scope (AGENTS.md 4.1) and
  wait for the team's OK.
- **Otherwise:** map it to phases using the table below, and say in one
  sentence what you will check, where (localhost or live), and what you
  will leave out. Start straight away unless the request is unclear or
  needs something only the team can give (a test login, a write).

| If the request mentions… | Run these phases of AGENTS.md section 4 |
|---|---|
| `static`, `build`, `types`, `lint` | 4.2 commands only |
| `functions`, `logic`, a file in `src/lib/` or `backend/src/` | 4.2 function review, for those files |
| `api`, `endpoint`, `backend`, a path like `/v1/reviews` | 4.3, for those endpoints (all from the spec if none named) |
| `middleware`, `cors`, `auth guard`, `headers` | 4.4 |
| `database`, `rls`, `security`, `secrets` | 4.5, plus 4.4's act-as-traveler check |
| `e2e`, `workflow`, `flow`, a feature name (reviews, likes, replies, login, profile, live updates) | 4.6, for those workflows |
| `ui`, `ux`, `usability`, `design` | 4.7 |
| `responsive`, `mobile`, a width | 4.7's responsive item, using `/responsive-check` |
| `a11y`, `accessibility`, `wcag`, `keyboard`, `contrast`, `screen reader` | 4.8 |
| a page (`/login`, `/destinations/[id]`, home) | the asked-for phases, on that page only (4.7 + 4.8 if no phase named) |
| a ticket number (`93`) | read the ticket; test its acceptance criteria with the matching phases |
| `live` | run on https://lakat-iloilo.vercel.app and https://api-lakat-iloilo.vercel.app |
| `quick` | the asked-for phases, top checks only; say what was skipped |

You can combine rows: "api and middleware on live" runs 4.3 and 4.4
against the live URLs.

## 2. Check the ground before testing

- Localhost: check the servers are already up
  (`curl -s -o /dev/null -w "%{http_code}" http://localhost:5000/v1/destinations`
  and the same for `http://localhost:3000`). If not, ask the team to
  start them. Never start a second backend.
- Browser work: use whatever browser tool is available; hard refresh
  (Ctrl+Shift+R) first; measure with JavaScript, not only screenshots.
- Logins: fake the backend's answer in the browser and say clearly it
  was a pretend answer.

## 3. Report

- A narrow request: the AGENTS.md 4.9 report cut down to the phases you
  ran — verdict in one sentence, a small scorecard, findings in two lists
  (A. Spec, B. Safety / standards / UX / accessibility), each with
  severity, `file:line` or page + step, how you checked it, the root cause
  in plain words, and the smallest fix.
- A full evaluation: the whole 4.9 report. Ask before saving it to
  `docs/evaluations/YYYY-MM-DD.md`.
- Always end with **what was not checked** and a numbered list of steps
  for the team to test themselves (like `/live-check`).
- Define any jargon the first time (for example "CORS — the rule that
  says which websites may call the backend from a browser").

## 4. Then wait

Offer to fix findings one at a time. Do not start fixing until the team
picks one. New ideas that are not in the spec are scope: offer
`docs/LATER.md`.
