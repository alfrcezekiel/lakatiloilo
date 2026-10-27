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
- New methods or headers must be added to `enableCors` in `main.ts`.
- Every new endpoint gets a line in the spec's endpoint list.
