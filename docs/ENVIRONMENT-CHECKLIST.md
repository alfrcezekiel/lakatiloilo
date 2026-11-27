# Environment checklist: moving staging or production to a Supabase project

Use this whenever staging or production starts using a **different Supabase
project**, or when one of them stops loading after its settings changed.

Written after 2026-11-26, when staging moved to a new project and broke three
times in a row: the backend could not log in, the Deploy workflow could not
reach the database, and the destinations and accommodations lists answered
500 because one migration never ran. Each step below is one of those
failures.

Never paste a password, key or full connection string into a chat, an issue
or this repo. Every value below goes only into Vercel or GitHub settings.

## Words used here

- **Project ref**: the project's ID, the part after `/project/` in its
  Supabase dashboard address (for example `abcdefghijklmnopqrst`).
- **Pooler host**: the server in front of the database, such as
  `aws-1-ap-northeast-2.pooler.supabase.com`. **Each project has its own.**
  Copy it from the project's **Connect** button. Never type it, and never
  copy it from the other environment.
- **Transaction pooler** (port **6543**): what the backend uses.
- **Session pooler** (port **5432**): what the Deploy workflow uses.

## Which settings belong to which environment

| Setting | Where | Staging | Production |
|---|---|---|---|
| `DATABASE_URL` (backend) | Vercel → api-lakat-iloilo-backend → Environment Variables | **Preview** row | **Production** row |
| `SUPABASE_URL`, `SUPABASE_ANON_KEY` (backend) | same project | Preview | Production |
| `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (website) | Vercel → website project → Environment Variables | Preview | Production |
| `NEXT_PUBLIC_APP_ENV` (website) | website project | `staging` | `production` |
| `API_URL` (website) | website project | `https://api-staging.lakatiloilo.com` | `https://api.lakatiloilo.com` |
| `STAGING_DB_URL` / `PROD_DB_URL` | GitHub → Settings → Secrets and variables → Actions | `STAGING_DB_URL` | `PROD_DB_URL` |

Vercel lets a variable be set for **one branch only** (for example
"Preview (staging)"). A branch-only row beats the general Preview row, so
search for each name and check **every** row it has.

## Checklist

### 1. The backend's database login (Vercel)

- [ ] In the Supabase project, open **Connect → Transaction pooler** (port 6543)
      and copy the address.
- [ ] Change the user `postgres.<ref>` to `lakat_api.<ref>`.
- [ ] Put in the `lakat_api` password (step 2), not the `postgres` one.
- [ ] Paste it into the backend's `DATABASE_URL` for the right environment
      (and into any branch-only row).
- [ ] The `<ref>` in `DATABASE_URL` is the same as in `SUPABASE_URL`.

Symptom when wrong: `tenant/user lakat_api.<ref> not found` in the backend's
logs, and `/health` answers "The server is starting. Please try again in a
moment." That message means the backend failed to start, not that it is
starting.

### 2. The `lakat_api` password (Supabase)

The first migration creates `lakat_api` **without** a password, on purpose,
so a new project's backend cannot log in until someone sets one.

- [ ] Make one (PowerShell or Git Bash):
      `node -e "console.log(require('crypto').randomBytes(24).toString('hex'))"`
- [ ] In that project's **SQL Editor**:
      `alter role lakat_api with password '<the password>';`
- [ ] Delete that query from the SQL Editor's saved list or history afterwards.
- [ ] Use the same password in step 1.

Symptom when wrong: `password authentication failed for user "lakat_api"`.
**One** such line right after a change is normal while the pooler catches up.
It only matters if it keeps repeating.

### 3. The backend's Supabase address and key (Vercel)

- [ ] `SUPABASE_URL` = `https://<ref>.supabase.co` of **this** project.
- [ ] `SUPABASE_ANON_KEY` = this project's **publishable (anon)** key. Never
      the `service_role` key or an `sb_secret_` key.

Review photo and video addresses are built from `SUPABASE_URL`, so if it
points at another project, every thumbnail breaks.

### 4. The website (Vercel, website project)

- [ ] `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` come from
      the **same** project as the backend's `SUPABASE_URL`. The website only
      allows photos and videos from that one address (Content-Security-Policy
      in `src/proxy.ts`).
- [ ] `NEXT_PUBLIC_APP_ENV` is `staging` on staging and `production` on
      production.
- [ ] `NEXT_PUBLIC_SUPABASE_IMAGE_RESIZE` is `true` **only** if this Supabase
      project is on a paid plan. Leave it out on the free plan: resized photo
      copies answer 403 there and every thumbnail stays empty
      (`src/lib/photo-url.ts`).
- [ ] `API_URL` is the backend's address, with no `/` at the end.

### 5. The Deploy workflow's database address (GitHub)

- [ ] In the Supabase project, open **Connect → Session pooler** (port **5432**)
      and copy the address.
- [ ] Keep the user `postgres.<ref>` and put in the project's `postgres`
      password (Project Settings → Database).
- [ ] Save it as `STAGING_DB_URL` or `PROD_DB_URL`.

Symptom when wrong: the Deploy run fails at `supabase db push` with
`tenant/user postgres.<ref> not found`, and the backend never redeploys.

### 6. One way in for migrations

- [ ] In **both** Supabase projects, open Settings → Integrations → GitHub and
      switch **Deploy to production** off.

Migrations reach hosted databases only through `.github/workflows/deploy.yml`.
When something else builds the tables, the database ends up with the schema
but no migration history, and the next Deploy run fails (step 7).

### 7. Migration history (read-only check, Supabase SQL Editor)

```sql
select version from supabase_migrations.schema_migrations order by version;
```

- [ ] Every file in `supabase/migrations/` is listed.

If the list is empty or short, but the tables already exist, the Deploy run
fails with `role "lakat_api" already exists`. Before anything else, check
that the database really matches the missing files:

```sql
select
  (select count(*) from pg_tables   where schemaname = 'public')  as public_tables,
  (select count(*) from pg_policies where schemaname = 'public')  as public_policies,
  (select count(*) from pg_policies where schemaname = 'storage') as storage_policies,
  (select count(*) from storage.buckets
     where id in ('review-photos','place-photos','review-videos')) as buckets,
  (select extnamespace::regnamespace::text from pg_extension where extname = 'postgis') as postgis_schema;
```

On 2026-11-26 the matching values were 17, 62, 14, 3 and `extensions`. Recount
them if migrations have been added since.

- [ ] Only if they match, the team agrees, then marks the files that are
      already in the database as applied. This writes only to the history
      list and changes no tables:

```bash
npx supabase migration repair --remote="<the Session pooler address from step 5>" --status applied <version> <version>
```

- [ ] Re-run the Deploy workflow. It should apply only the missing files.

If the values do not match, stop and ask: the database is only partly built.

### 8. The backend's permissions (read-only check)

```sql
select has_schema_privilege('lakat_api', 'extensions', 'USAGE') as can_use_postgis,
       pg_has_role('lakat_api', 'authenticated', 'MEMBER')       as can_act_as_traveler;
```

- [ ] Both are `true`.

If `can_use_postgis` is false, `/v1/destinations` and `/v1/accommodations`
answer 500 with `function st_asgeojson(extensions.geography) does not exist`.
The fix is migration `20261123172202_restore_lakat_api_role_grants.sql`
reaching the database (step 7). Never grant it by hand in the dashboard.

### 9. Redeploy and check

Changed variables only apply to **new** deployments. The backend's deploys for
`staging` and `main` happen only through the Deploy Hook (`backend/vercel.json`),
so a push alone does not redeploy it.

- [ ] Re-run the Deploy workflow for the branch, or in Vercel filter
      Deployments by branch and **Redeploy** the newest one for **that branch**.
      A Preview deployment built from `main` does not serve the staging address.
- [ ] In the backend's logs, the newest lines show the **new** deployment ID
      and `Nest application successfully started`.
- [ ] `/health` answers on the backend's address.
- [ ] `/v1/destinations` and `/v1/accommodations` answer with JSON.
- [ ] The website loads after a hard refresh (Ctrl+Shift+R): lists, place
      pages, review photos and videos.

### 10. Data and files

A new project starts with no places, reviews or uploaded files. The Deploy
workflow never sends `supabase/seed.sql` to a hosted database.

- [ ] Empty lists with no error mean the setup works but has no data yet.
- [ ] If rows were copied from another project, the **files** were not: review
      photos and videos stay in the old project's Storage, so their thumbnails
      break. Copy the files too, or delete the copied rows.
