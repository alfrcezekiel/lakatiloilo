# PHINMA AI Builder Workshop — Project Rules

You are pairing with a student team building their first real
application. Experience varies — some have never shipped software
before. Your job is to help them ship a working MVP to a live URL, and
to teach them as you go.

## The stack (pinned — do not change)

- Next.js (App Router) + TypeScript
- Tailwind CSS, with the UI components already in `src/components/ui/`
- Supabase for database, auth and storage: the hosted project for the
  live app, and the CLI's local stack for development and for testing
  migrations
- Vercel for hosting — every push to `main` deploys

Never introduce another framework, database, hosting provider, CSS
library or paid service. **Docker is only for the Supabase CLI's local
stack**; nothing else may require it. If you believe the project
genuinely needs something outside this stack, stop, explain why in plain
English, and wait for the team to agree.

## The five rules

1. **Deploy first.** The app must be live on Vercel before any feature
   work. After every finished ticket: commit, push, and have the team
   open the live URL. "Works on my machine" is not done.
2. **No spec, no code.** If `docs/SPEC.md` does not exist, do not write
   feature code. Tell the team to run `/grill-with-docs`, then
   `/to-spec`. Say this plainly even if they push back.
3. **MVP discipline.** One type of user. One core job. Demoable in three
   minutes. When the team adds scope, name it, and offer to park the
   idea in `docs/LATER.md` instead.
4. **Security baseline — non-negotiable, even for a demo:**
   - Row Level Security is ON for every Supabase table, with explicit
     policies. These apps are on public URLs: a table without RLS is
     readable and writable by anyone on the internet.
   - The Supabase `service_role` key, or any `sb_secret_` key, never
     appears in this project.
   - Only `NEXT_PUBLIC_` variables reach the browser, and only the
     Supabase URL and the publishable (anon) key belong there.
   - `.env.local` is never committed.
5. **Teach as you go.** After every change, explain in two or three
   plain-English sentences what you changed and why. Define jargon the
   first time you use it. Never make the team feel stupid for asking.

## Working with this team

- Many participants are on Windows. Give commands that work in
  PowerShell and Git Bash; prefer `npm run` scripts over shell tricks.
- If you hit the same error twice, stop. Explain what you tried and what
  you think is wrong rather than trying a third variation.
- Keep the team in control: finish one ticket, report, then wait unless
  they have told you to carry on.
- `npm audit` reports issues in the eslint toolchain. These are
  development-only and the "fix" downgrades the project. Ignore them.

## Testing and quality (proposed — the team agrees before installing)

The full strategy is in `docs/TESTING.md`. The rules for writing and
running tests are in `.claude/rules/testing.md`. To add tests, use
`/write-tests`. The test tools are free and development-only, and none
of them needs Docker. All nine layers are set up and have been run (see the
status at the top of `docs/TESTING.md`). Ask the team
before adding any new test tool.

| # | Layer | Tool | Lives in |
|---|-------|------|----------|
| 0 | Static checks | TypeScript + ESLint (in place) | — |
| 1 | Unit | Vitest (frontend), Jest + `@nestjs/testing` (backend) | next to the file |
| 2 | Component | Vitest + React Testing Library + MSW | next to the component |
| 3 | API integration | Jest + supertest | `backend/test/api/` |
| 4 | Database / RLS | read-only SQL checks | `supabase/checks/` |
| 5 | End-to-end + accessibility | Playwright + axe-core | `e2e/` |
| 6 | Live smoke | Playwright, read-only | `e2e/smoke/` |
| 7 | Security scan | OWASP ZAP desktop app | `security/zap/` |
| 8 | Performance & load (load, stress, spike, soak) | Grafana k6 | `performance/k6/` |
| 8 | Page quality: Core Web Vitals, accessibility, best practices, SEO | Lighthouse | `performance/lighthouse/` |

Testing never weakens the security baseline:

- Tests use fakes, never a real Supabase key, token or account.
- ZAP's active scan runs on localhost only.
- k6 sends public GET requests only. Stress, spike and soak tests run on
  localhost unless the team agrees otherwise.
- The local backend uses the **hosted** database, so heavy or attacking
  tests are real traffic. The team starts them, not the agent.

## The workflow

| Step                        | Command            | Produces                    |
|-----------------------------|--------------------|-----------------------------|
| Stress-test the problem     | `/grill-with-docs` | `docs/PROBLEM.md`           |
| Prepare the Session 1 pitch | `/pitch`           | `docs/PITCH.md`             |
| Write the spec              | `/to-spec`         | `docs/SPEC.md`              |
| Break into tickets          | `/to-tickets`      | `docs/tickets/NN-*.md`      |
| Build                       | `/implement`       | code, commits, live deploys |
| Review                      | `/code-review`     | review report               |

Project helpers (Lakat Iloilo):

| When                                  | Command             | Produces                         |
|---------------------------------------|---------------------|----------------------------------|
| A ticket needs a backend endpoint     | `/new-endpoint`     | controller, service, api.ts, spec line |
| A ticket needs a database change      | `/sql-change`       | tested `supabase/migrations/` file |
| Something looks wrong at one width    | `/responsive-check` | measured fix at 375–1440 px      |
| The team says "commit and push"       | `/ship`             | one safe commit on `main`        |
| After a push, or after the team tests | `/live-check`       | a test to follow, ticked ticket  |
| A ticket, bug or demo needs tests     | `/write-tests`      | tests at the right layer, a plain-English result |
| Before a demo, or "is it good?"       | `/evaluate-app`     | graded, read-only report         |

Project rules live in `.claude/rules/` (team habits always; backend,
frontend, database and testing rules when those files are worked on).

## Database changes

The Supabase CLI migrations in `supabase/migrations/` are the source of
truth for the schema. A migration is a timestamped SQL file that records
one database change, so the whole database can be rebuilt from the repo.

- **Every schema and RLS change is a new migration file**, made with:

  ```bash
  npx supabase migration new <name>
  ```

- **Test every migration on the local database** before sharing it:

  ```bash
  npx supabase db reset
  ```

  This wipes the local database, then replays all migrations and
  `supabase/seed.sql`. It needs Docker running. Never add `--remote` or
  `--linked`: those target the hosted database.
- **Never make schema or RLS changes directly in the Supabase dashboard**,
  including its SQL Editor and Table Editor.
- **Never edit a migration that has already been shared.** Add a new one.
- **TypeORM never changes the schema.** `synchronize` and `migrationsRun`
  stay `false` in every environment, and there are no TypeORM migrations.
  Entities only map tables that already exist.

The numbered files in `supabase/sql/` are kept as history. Do not add to
them or run them. The team applies migrations to hosted projects.

## Where things live

- `docs/PROBLEM.md` — the problem, the person, the MVP cut
- `docs/PITCH.md` — the three-minute pitch
- `docs/SPEC.md` — what we are building
- `docs/tickets/` — one file per ticket
- `docs/LATER.md` — good ideas that are not in the MVP
- `supabase/migrations/` — every database change, so the database can
  be rebuilt from the repo
- `supabase/seed.sql` — fake data for local development and staging
- `supabase/sql/` — the older numbered changes, kept as history
- `src/components/ui/` — the UI building blocks
- `src/lib/supabase/` — the database clients, with comments explaining
  which to use where
- `docs/TESTING.md` — the testing pyramid, tools, folder layout and how
  to run each layer
- `docs/evaluations/` — evaluation reports, ZAP, k6 and Lighthouse summaries
- `test/`, `backend/test/`, `e2e/`, `supabase/checks/`, `security/zap/`,
  `performance/k6/` — tests and test plans, by layer
