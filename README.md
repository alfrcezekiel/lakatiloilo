# PHINMA AI Builder — team template

**Your live URL:** https://lakat-iloilo.vercel.app/

This is your team's starting point. It is already a working Next.js app
that deploys to Vercel. You will delete the starter page and build your
own thing on top.

## Setup (once per team, ~10 minutes)

**1. Make your own copy**

On this repo's GitHub page, click **Use this template → Create a new
repository**. Name it after your team. Then add your teammates:
**Settings → Collaborators**.

**2. Put it on the internet — before writing any code**

Go to [vercel.com](https://vercel.com), sign in with GitHub, then
**Add New → Project** and import your new repo. Accept the defaults and
click **Deploy**.

In about a minute you will have a live URL. Open it on your phone. Paste
it at the top of this file.

From now on, every push to `main` updates that URL automatically.

**3. Get it on your laptop**

Only one laptop per team needs this — the **driver** laptop. Rotate who
drives at every ticket so everyone gets a turn.

```bash
git clone <your repo URL>
cd <your repo>
npm install
npm run dev
```

Open http://localhost:3000. You should see the same page as your live
URL.

**4. Start Claude Code**

```bash
claude
```

Type `/` and check you can see `grill-with-docs`, `pitch`, `to-spec`,
`to-tickets`, `implement` and `code-review`. If you can, you are ready.

Then run:

```
/grill-with-docs
```

Have a real problem in mind, and a real person you have watched struggle
with it. You will be asked.

## Supabase (Ticket 02 — Session 2, not before)

1. Create a project at [supabase.com](https://supabase.com) (free tier).
2. In your project, click **Connect** and copy the Project URL and the
   **publishable key** (it starts with `sb_publishable_`). Older projects
   call it the `anon` key. Either works.
3. Copy `.env.example` to `.env.local` and paste them in. The publishable
   key goes in `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
4. Add the **same two variables** in Vercel: **Settings → Environment
   Variables**, then redeploy. Forgetting this step is the single most
   common reason the local app works and the live one does not.
5. Read `supabase/sql/001-example.sql`. It explains Row Level Security,
   which is what stops strangers reading your data.

## The commands

| Command            | What it does                                      |
|--------------------|---------------------------------------------------|
| `/grill-with-docs` | Interviews you hard about the problem. Start here |
| `/pitch`           | Turns that into your three-minute Session 1 pitch |
| `/to-spec`         | Writes the spec for what you will build           |
| `/to-tickets`      | Breaks the spec into small tickets                |
| `/implement`       | Builds one ticket, then deploys it                |
| `/code-review`     | Checks it is correct and safe before you demo     |

Run them in that order. The agent will refuse to write feature code
before there is a spec — that is deliberate, not a bug.

### Project helpers (Lakat Iloilo)

Use these while you build, whenever the situation fits.

| When                                  | Command             | Produces                               |
|---------------------------------------|---------------------|----------------------------------------|
| A ticket needs a backend endpoint     | `/new-endpoint`     | controller, service, api.ts, spec line |
| A ticket needs a database change      | `/sql-change`       | `supabase/sql/NNN-*.sql` to run        |
| Something looks wrong at one width    | `/responsive-check` | measured fix at 375–1440 px            |
| The team says "commit and push"       | `/ship`             | one safe commit on `main`              |
| After a push, or after the team tests | `/live-check`       | a test to follow, ticked ticket        |
| A ticket, bug or demo needs tests     | `/write-tests`      | tests at the right layer, explained    |
| Before a demo, or "is it good?"       | `/evaluate-app`     | graded, read-only report               |

Project rules live in `.claude/rules/`: team habits always apply, and
the backend, frontend, database and testing rules apply when those files
are worked on.

## Testing (proposed)

We test in layers, like a pyramid. The bottom has many small, fast
tests, and the top has a few slow ones that check the whole app. The
full plan is in [`docs/TESTING.md`](docs/TESTING.md). None of these
tools is installed yet. The team agrees first, then installs them. They
are all free, and none needs Docker.

| # | Layer | Checks that… | Tool |
|---|-------|--------------|------|
| 0 | Static | the code has no type or lint errors | TypeScript, ESLint (in place) |
| 1 | Unit | one function gives the right answer | Vitest, Jest |
| 2 | Component | a screen shows the right thing and works with a keyboard | Vitest + React Testing Library |
| 3 | API | the backend refuses the wrong people with the right code | Jest + supertest |
| 4 | Database | every table has Row Level Security | SQL checks in Supabase |
| 5 | End-to-end | a traveler can finish a whole task in a browser | Playwright + axe |
| 6 | Live smoke | the live URL is up after a push | Playwright |
| 7 | Security | there are no well-known weaknesses (headers, cookies, injection) | OWASP ZAP |
| 8 | Performance | the app stays fast with many travelers: **load, stress, spike, soak** | Grafana k6 |

Once the tools are installed:

```bash
npm run test
```

```bash
npm run test:e2e
```

```bash
npm run perf:smoke
```

**Before any security or performance test, know this:** your local
backend uses the *real* hosted database. So ZAP's attack scan runs on
localhost only. k6 only reads public pages, and its heavy tests (stress,
spike, soak) run on localhost unless the whole team agrees otherwise.

## The rules

1. **Deploy first.** Live URL before features.
2. **No spec, no code.**
3. **One user, one job, demoable in three minutes.**
4. **Row Level Security on, always.** Your app is public. Without RLS,
   so is your data.
5. **Never commit `.env.local`.**

## What is already here

```
src/app/page.tsx          the starter page — delete it and build yours
src/components/ui/        Button, Card, Input, Textarea, Label
src/lib/supabase/         database clients, with comments
supabase/sql/             your database changes, numbered
docs/                     problem, pitch, spec and tickets live here
docs/TESTING.md           the testing plan: layers, tools, folders
CLAUDE.md                 the rules the agent follows
AGENTS.md                 the same rules for any AI coding agent
```

Planned test folders (created when the team sets up testing):

```
src/**/*.test.tsx         unit + component tests, next to the code
test/                     shared frontend test helpers and mocks
backend/src/**/*.spec.ts  backend unit tests, next to the code
backend/test/api/         backend API tests
e2e/                      Playwright: flows, accessibility, live smoke
supabase/checks/          read-only RLS checks
security/zap/             OWASP ZAP scan plans
performance/k6/           Grafana k6: smoke, load, stress, spike, soak
```

## When something breaks

- **Build fails on Vercel but works locally** — run `npm run build` on
  your laptop. That is the exact command Vercel runs. It will show you
  the same error.
- **Live site cannot reach the database** — your environment variables
  are probably missing in Vercel, or you did not redeploy after adding
  them.
- **`npm audit` shows warnings** — these are in the development
  toolchain only. Ignore them; the "fix" breaks the project.
- **The agent keeps failing at the same thing** — stop it, and ask it to
  explain what it thinks is wrong instead of trying again. Then get a
  facilitator.
