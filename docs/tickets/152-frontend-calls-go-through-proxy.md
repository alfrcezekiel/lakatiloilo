# 152 — Frontend calls go through proxy

**What to build:** Every backend call in the browser goes to `/api/v1/...`
(the proxy from ticket 151). Server-side code (server components, `src/proxy.ts`)
calls the backend directly with the server-only `API_URL`. The site works
exactly as before.

**Why (plain English):** Ticket 151 built the middle-man; this ticket makes
the browser actually use it. Code that already runs on the server does not
need the middle-man. Sending it through `/api` would mean our server calling
itself over the internet, which is slower and breaks during the build.

**Blocked by:** 151

**Status:** done

- [x] All functions in `src/lib/api.ts` are updated to call `/api/*` instead of the backend address
- [x] The home page loads places correctly through the proxy
- [x] Destination and accommodation detail pages load correctly through the proxy
- [x] Reviews load correctly through the proxy
- [x] Writing, editing, and deleting reviews work through the proxy
- [x] Login and signup work through the proxy
- [x] All existing features work as before
- [x] `adminSendDelete` (the keepalive delete) also goes through `/api`
- [x] Server-side calls in `src/lib/api.ts` use `API_URL` directly, not a call to our own site
- [x] A search of `src/` finds no browser code that names the backend address
- [x] The e2e fixtures and `vitest.config.mts` no longer need `NEXT_PUBLIC_API_URL`
- [ ] Works on the live URL

## Agent steps

1. **Read first:** the top of `src/lib/api.ts` (the base-URL helper and its
   comment), `adminSendDelete` (around line 804), and the FormData calls.
2. **One base-URL helper:**
   - in the browser (`typeof window !== "undefined"`) → `"/api"`;
   - on the server → `process.env.API_URL` (throw a clear error if missing).
   Every function builds its URL from this helper; no function reads an env
   variable by itself.
3. **Fix the header comment.** It says `/api/proxy/*`; the real path is `/api/*`.
4. **Fix `adminSendDelete`.** Replace `NEXT_PUBLIC_API_URL` with the helper.
   Keep `keepalive: true` (it lets the delete finish while the tab closes).
5. **Search for leftovers** and fix each hit:
   ```bash
   git grep -n "NEXT_PUBLIC_API_URL" -- src e2e vitest.config.mts performance
   ```
   Also search for the backend's host name and for `fetch(` in `src/components`
   and `src/app`. A component must call a function in `src/lib/api.ts`, never
   `fetch` the backend itself.
6. **Tests and tools:** in `e2e/fixtures/test.ts`,
   `e2e/real-writes/review-lifecycle.spec.ts` and `vitest.config.mts`, point
   mocks at `/api/v1/...` (MSW handlers match the browser path): set the
   jsdom page to `http://localhost:3000` in `vitest.config.mts` and
   `API = "http://localhost:3000/api"` in `test/mocks/handlers.ts`. Leave
   k6 (`performance/k6/lib/config.js`) pointed at the backend: it load-tests
   the backend itself, and the team's runs and pass marks stay comparable.
7. Run `npm run lint`, `npx tsc --noEmit` and `npm test`.

## How to check (agent)

- `npm run dev`, open the site in the built-in browser, and read the network
  requests: every backend call is `/api/v1/...` on `localhost:3000`, none to
  the backend's host.
- Open an admin page and a place page with server-rendered data. They load,
  and the dev log shows no request from our server to its own `/api`.
- Sign-up and log-in screens: fake the backend's answer in the browser and
  say clearly it was a pretend answer. Never create a real account.

## Team tests (live URL)

Hard refresh (Ctrl+Shift+R), then: home page, a destination, an
accommodation, write/edit/delete a review with a photo, log in and out, and
one admin delete. Open DevTools → Network and confirm that no request goes to
the backend's address.

**Change (2026-11-19, team request):** Ticket sharpened with step-by-step
agent instructions. Added the keepalive admin delete, server-side calls using
`API_URL` directly, a leftover search, and the test/tool config. The existing
ticks are kept; the new boxes are not ticked yet.

**Progress (2026-11-19, agent):** `src/lib/api.ts` has one helper,
`backendBase()`: `/api` in the browser, `API_URL` on the server (a clear
error if missing). axios and `adminSendDelete` (keepalive kept) both use it;
the old `NEXT_PUBLIC_SITE_URL` self-call is gone. Tests moved to the proxy
path (`vitest.config.mts`, `test/mocks/handlers.ts`, `e2e/fixtures/test.ts`,
`e2e/real-writes/review-lifecycle.spec.ts`). `git grep NEXT_PUBLIC_API_URL`
outside docs finds nothing, and no component `fetch`es the backend. Home
page in the built-in browser: every request is to `localhost:3000` (plus
images). Not checked: log in, writes and admin pages (team tests), and
`npm run test:e2e`.

**Team confirmed (2026-11-20):** every box ticked on localhost. "Works on the live URL" stays open until the team checks the live site.
