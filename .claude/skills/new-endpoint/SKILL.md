---
name: new-endpoint
description: Adds one NestJS backend endpoint the Lakat Iloilo way — controller validation, a service that reads with TypeORM or writes as the logged-in traveler, CORS, a function in src/lib/api.ts and a spec line — then tests it with curl. Use when a ticket needs the website to get or change data through the backend.
disable-model-invocation: true
---

Add **one endpoint** end to end. If the team did not say which, ask:
method, path, who may call it, what it takes and what it answers.

If the endpoint is not in `docs/SPEC.md` or a ticket, stop: offer to add
it with `/to-spec` first. No spec, no code.

## Steps

1. **Say the contract** in one block before coding:
   `POST /v1/<thing>` · who may call it · body · answer (status + JSON) ·
   each refusal (status + message).
2. **Controller** (`backend/src/v1/<thing>/<thing>.controller.ts`):
   - Validate every field with a friendly message
     (`BadRequestException('Please …')`).
   - Logged-in only: read the token with the `loginToken` helper (see
     `reviews.controller.ts`).
   - Set `@HttpCode` on purpose.
3. **Service:**
   - Reading: TypeORM repository, only the columns the website needs.
   - Writing as a traveler: go through `asTraveler` so Row Level
     Security decides. Values as `$1, $2…`, never glued into SQL.
   - Turn database errors into plain messages (see `toHttpError`).
4. **Module:** register it in `v1.module.ts`. New method or header → add
   it to `enableCors` in `backend/src/main.ts`.
5. **Database:** if the table or column is new to `lakat_api`, use
   `/sql-change` and wait for the team to apply it.
6. **Website:** add one function to `src/lib/api.ts` with a comment
   saying what it calls and answers. Use it from the component, showing
   refusals with `backendMessage(error)`.
7. **Docs:** add the endpoint line to the spec's endpoint list and a
   progress note to the ticket.

## Check

- `cd backend && npx tsc --noEmit -p tsconfig.json` (never
  `npm run build` while the team's watcher runs).
- `npx tsc --noEmit` and `npx eslint` on the changed website files.
- `curl` against `http://localhost:5000` for every refusal you can reach
  without a real login (none, fake token, bad id, bad body). Report each
  status and message in a short list.
- Ask the team to try the happy path while logged in, with the Network
  tab open, after a hard refresh.

Then explain in two or three plain sentences what the endpoint does and
how Row Level Security still protects the data. Do not commit until the
team asks.
