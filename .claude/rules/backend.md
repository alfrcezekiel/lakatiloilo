---
paths:
  - "backend/**"
---

# NestJS backend rules

## Running and checking

- The team keeps `nest start --watch` running on port 5000. **Never run
  `npm run build` in `backend/`** while it runs: it deletes `dist/` and
  crashes the watcher. Check types with
  `npx tsc --noEmit -p tsconfig.json` instead.
- Never start a second backend: port 5000 is taken and you get
  EADDRINUSE. The watcher reloads by itself after you save a file.
- After a change, test it with `curl` against `http://localhost:5000`.

## Data access

- **Every request for the app's own data goes through this backend.**
  The browser never calls Supabase's data API (`/rest/v1/...`) for
  places or reviews.
- Reading uses TypeORM through the `lakat_api` database login
  (supabase/sql/016 and 023).
- **Writing as a traveler always goes through `asTraveler`** in
  `reviews.service.ts`: check the login token with Supabase Auth, then,
  inside one transaction, set `request.jwt.claims` and
  `set local role authenticated`, so Row Level Security decides. Never
  write around it.
- Values always travel as parameters (`$1`, `$2`), never glued into the
  SQL text.
- `DATABASE_URL` is a secret, like a password: `lakat_api` can act as
  any traveler during that switch.

## Supabase Auth

- Only the publishable (anon) key, as `SUPABASE_ANON_KEY`. Never the
  `service_role` key or an `sb_secret_` key.
- Sign-up and log-in use `freshClient()`: a new client per request, so
  two travelers' logins can never mix.
- Passwords are passed straight to Supabase: never stored, logged or
  sent back.
- Sign-up does not log anyone in: end the session Supabase creates.

## Endpoints

- Path: `v1/<thing>`. Validate the body in the controller with friendly
  messages; the database checks everything again.
- Refusals carry a plain sentence in `message` (and Supabase's `code`
  for auth), because the website shows `message` as it is.
- Set the status code on purpose with `@HttpCode` (for example 200 with
  a `{ message }` body for DELETE, as the team asked).
- CORS is off unless `CORS_ORIGIN` is set (`app-setup.ts`): browsers
  reach the backend only through the website's `/api` proxy since ticket
  152. New methods must be added to the proxy route's exports
  (`src/app/api/[...path]/route.ts`) and new request headers to its
  `REQUEST_HEADERS`, and to `enableCors` in case CORS is ever switched on.
- Every new endpoint gets a line in the spec's endpoint list.

## Admin endpoints (admin dashboard, from ticket 107)

- Every admin endpoint lives under `v1/admin` and goes through
  `AdminOnlyMiddleware` (401 without a login, 403 "This page is for the
  Lakat Iloilo team." for non-admins). It is applied in `AdminModule` with
  `forRoutes(AdminController)`: **a new admin controller must be added to
  that `forRoutes(...)`**, or its endpoints are unprotected. Only
  `POST v1/admin/login` is excluded.
- Admin endpoints still run their database work as the logged-in admin
  (`TravelerTransactions`), so Row Level Security checks every change too.
  Never check "is admin" from anything the browser sends; ask the
  database's `is_admin()` (`AdminAccess`).
