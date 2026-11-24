# Lakat Iloilo: A Centralized Geo-Tourism Discovery Platform for Tourist Destinations, Accommodations, Local Cuisines, Interactive Mapping and Travel Guidance in Iloilo City and Iloilo Province

**Your live URL:** https://lakat-iloilo.vercel.app/

## About Lakat Iloilo

**Lakat Iloilo** is a centralized geo-tourism platform for **Iloilo City
and Iloilo Province**. Information about where to go and where to stay
in Iloilo is scattered across Facebook pages, Google results and random
websites. Lakat Iloilo puts it in one place: travelers can discover
mountains, food spots, heritage sites, festivals, parks and places to
stay — each with its location, photos and honest reviews from other
travelers — without spending hours searching.

*"Lakat"* means "walk" or "travel" in Hiligaynon.

![Lakat Iloilo home page: the "Lakat na, Iloilo." hero with a search bar, a City/Province toggle, category chips, and Featured and Trending place cards](docs/images/home-page.webp)

### Key features

- **One place for every destination** — mountains and hiking spots,
  foods and dine-ins, walking areas, festivals, nature and parks, and
  heritage sites, plus hotels and condominiums.
- **City or Province** — a toggle that narrows every list to Iloilo City
  or the rest of Iloilo Province.
- **Category cards and chips** — click a category to jump straight to
  that kind of place.
- **Live search suggestions** — type a place name and suggestions appear
  as you type, filtered by the chosen category and area.
- **Location details** — every place has its address and map
  coordinates, a short description and up to six photos, each with the
  photographer credited.
- **Ratings and reviews** — travelers with an account rate places from
  1 to 5 stars, write a review and add up to four photos. Anyone can read
  reviews and see each place's average rating.
- **Traveler types** — every reviewer says whether they are a local, a
  visitor from the Philippines or a foreign tourist, so readers know
  whose experience they are reading.
- **Community conversation** — reply to reviews, answer replies in
  threads, mark reviews and replies "Helpful", and report anything
  inappropriate.
- **Traveler profiles and notifications** — every reviewer has a public
  profile with their reviews, and a bell tells you when someone replies
  to you.
- **Live updates** — pages refresh themselves within seconds when a
  place, review or reply changes, with no reload needed.
- **Admin dashboard** — the Lakat Iloilo team moderates reported
  reviews, manages places, categories and photos, and can restore
  anything deleted from a 30-day Trash.
- **Secure by default** — Row Level Security on every database table,
  the backend address kept private on the server, and an enforced
  Content-Security-Policy.

### Built with

Next.js (App Router) + TypeScript, Tailwind CSS, a NestJS backend,
Supabase (database, login and photo storage) and Vercel hosting.

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

## Running the website against staging

`npm run dev` uses `.env.local`: your own backend on localhost:5000.
To try the website on your laptop with **staging's** data instead:

1. Copy `.env.staging.example` to `.env.staging.local` and fill it in
   from the website's Vercel project (**Settings → Environment
   Variables**, the staging/Preview values). Never Production's.
2. Stop `npm run dev` first (Ctrl+C): Next.js runs only one dev server
   per project folder. Then run `npm run dev:staging` and open
   http://localhost:3000. The STAGING badge in the corner shows which one
   you are on, and the terminal prints staging's backend and Supabase
   addresses. It refuses to start if the file is missing, points at
   localhost, or holds a secret Supabase key.

`.env.local` is not changed. Stop with Ctrl+C and run `npm run dev` to go
back. Anything you save while on staging is really saved there.

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
| A ticket needs a database change      | `/sql-change`       | tested `supabase/migrations/` file     |
| Something looks wrong at one width    | `/responsive-check` | measured fix at 375–1440 px            |
| The team says "commit and push"       | `/ship`             | one safe commit on `main`              |
| After a push, or after the team tests | `/live-check`       | a test to follow, ticked ticket        |
| A ticket, bug or demo needs tests     | `/write-tests`      | tests at the right layer, explained    |
| Before a demo, or "is it good?"       | `/evaluate-app`     | graded, read-only report               |

Project rules live in `.claude/rules/`: team habits always apply, and
the backend, frontend, database and testing rules apply when those files
are worked on.

## Testing

We test in layers, like a pyramid. The bottom has many small, fast
tests, and the top has a few slow ones that check the whole app. The
full plan, and how to run each layer, is in
[`docs/TESTING.md`](docs/TESTING.md). Every tool is free, and none needs
Docker. Results are written up in [`docs/evaluations/`](docs/evaluations/).

| # | Layer | Checks that… | Tool |
|---|-------|--------------|------|
| 0 | Static | the code has no type or lint errors | TypeScript, ESLint |
| 1 | Unit | one function gives the right answer | Vitest, Jest |
| 2 | Component | a screen shows the right thing and works with a keyboard | Vitest + React Testing Library + MSW |
| 3 | API | the backend refuses the wrong people with the right code | Jest + supertest |
| 4 | Database | every table has Row Level Security | SQL checks in Supabase |
| 5 | End-to-end | a traveler can finish a whole task in a browser | Playwright + axe |
| 6 | Live smoke | the live URL is up after a push | Playwright |
| 7 | Security | there are no well-known weaknesses (headers, cookies, injection) | OWASP ZAP desktop app |
| 8 | Performance | the app stays fast with many travelers: **load, stress, spike, soak** | Grafana k6 |
| 8 | Page quality | pages appear fast on a phone, and are accessible and findable | Lighthouse |

**Latest results (2026-11-21):** every k6 test passed, locally and on
the live site: 0 errors in 180,019 requests with up to 150 travelers at
once, and the CSP and hidden backend checks passed on every answer. A
second live round, with a full 60-minute soak, gave the same speeds
(live pages p(95) under 0.3 s) with no slow-down over the hour. The
breakpoint test (2026-11-22) found that one laptop running the website
reaches its limit at about 200 travelers at once (pages slower than
1.5 s, still 0 errors). That's the limit of one website process on one
CPU core, not of the live site. The live site did not break at all: it held
400 travelers at once for the whole 20-minute ramp, with pages p(95)
0.26 s and 0 errors in 111,017 requests.
Lighthouse on a phone (on the charger) scores 95–100 on every page, with
accessibility 100 everywhere. Ticket 158 made phones faster (home TBT
average 256 → 193 ms, place LCP average 2.91 → 2.38 s). Each still
misses its budget now and then by a hair, which the team accepted. Reports to open in a browser:
[`performance/k6/report.html`](performance/k6/report.html) and
[`performance/lighthouse/report.html`](performance/lighthouse/report.html).

The everyday commands:

```bash
npm run test
```

```bash
npm run test:e2e
```

```bash
npm run perf:smoke
```

```bash
npm run perf:site:smoke
```

```bash
npm run perf:lighthouse:mobile
```

The performance commands come in four groups, each with `smoke`,
`load`, `stress`, `spike`, `soak` and `breakpoint` (keeps adding
travelers until the app breaks, then stops by itself):

| Group | Target |
|-------|--------|
| `perf:…` | the local backend (`localhost:5000`) |
| `perf:site:…` | the local website and its `/api` (`localhost:3000`, on `npm run build` + `npm start`) |
| `perf:live:…` | the live backend |
| `perf:live:site:…` | the live website |

Run a smoke before anything bigger. Live stress, spike, soak and breakpoint refuse
to start unless the whole team agrees and adds `-- -e LIVE_OK=yes`.
Lighthouse also has `perf:lighthouse:desktop`, `perf:lighthouse:local`
and `perf:lighthouse:focus`. Lighthouse needs no `-e LIVE_OK=yes`: it
only opens pages, like one visitor.

**Run phone tests with the laptop on the charger.** Lighthouse builds
its pretend phone from your laptop's CPU, so on battery phone TBT and
Performance come out 2–3 times worse (home TBT 580 ms on battery, 186
ms on the charger, same code). Each phone page then shows
`⚠ CPU score … on battery?` under its heading: plug in and run again
before judging.

**Before any security or performance test, know this:** your local
backend uses the *real* hosted database. So ZAP's attack scan runs on
localhost only, k6 only reads public pages, and every load test is real
traffic. The team starts those tests, not the agent.

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
supabase/migrations/      your database changes (Supabase CLI)
supabase/seed.sql         fake data for local development and staging
supabase/sql/             older numbered changes, kept as history
docs/                     problem, pitch, spec and tickets live here
docs/TESTING.md           the testing plan: layers, tools, folders
CLAUDE.md                 the rules the agent follows
AGENTS.md                 the same rules for any AI coding agent
```

Test folders:

```
src/**/*.test.tsx         unit + component tests, next to the code
test/                     shared frontend test helpers and mocks
backend/src/**/*.spec.ts  backend unit tests, next to the code
backend/test/api/         backend API tests
e2e/                      Playwright: flows, accessibility, live smoke
supabase/checks/          read-only RLS checks
security/zap/             OWASP ZAP scan plans
performance/k6/           Grafana k6: backend and website, smoke to soak
performance/lighthouse/   Lighthouse: page quality and budgets
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
