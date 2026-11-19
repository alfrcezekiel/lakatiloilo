# 151 — Next.js API proxy route layer

**What to build:** A catch-all Next.js route at `src/app/api/[...path]/route.ts`
that forwards the browser's `/api/v1/...` requests to the NestJS backend and
hands back the backend's answer. The browser only ever talks to our own site,
so the backend's address never appears in the browser.

**Why (plain English):** A *proxy* is a middle-man. Before this ticket, the
browser called the NestJS server directly, so anyone could open DevTools and
see (and hammer) its address. Now the browser calls `/api/...` on our own
website, and our Vercel server makes the real call. The middle-man must be
strict: if it forwarded *any* path to *any* place, it would become an "open
proxy" that attackers could use to reach things we never meant to expose
(this attack is called SSRF — server-side request forgery).

**Blocked by:** None

**Status:** done

- [x] The catch-all API route at `/api/[...path]` is created
- [x] GET requests are forwarded to the backend with the same path, headers, and query parameters
- [x] POST, PATCH, DELETE requests are forwarded with the same path, headers, body, and query parameters
- [x] The backend's response (status code, headers, body) is returned unchanged
- [x] Only paths starting with `v1/` are forwarded; anything else gets a 404 without calling the backend
- [x] PUT is forwarded too; other methods get a 405 (OPTIONS gets Next.js's own 204 and never reaches the backend)
- [x] Photo uploads (multipart/form-data) arrive at the backend intact
- [x] A slow or down backend gives a clear 504 or 502 instead of a hanging page
- [x] `/api/wikimedia-photo` still works (the static route wins over the catch-all)
- [ ] Works on the live URL

## Agent steps

1. **Read first:** `src/app/api/[...path]/route.ts`, `src/app/api/wikimedia-photo/route.ts`,
   and the FormData calls in `src/lib/api.ts` (search for `FormData`).
2. **Allowlist the path.** Join `params.path` with `/`. If it does not start
   with `v1/`, or contains `..`, return `404` and do not call the backend.
3. **Allowlist the methods.** Write one `forward` function and export it as
   `GET`, `POST`, `PUT`, `PATCH`, `DELETE` (no copy-pasted handlers). Next.js
   answers other methods with `405` by itself, and `OPTIONS` with `204`.
4. **Read `API_URL` on the server.** If it is missing, return `500` with
   `{ message: "Server is not configured" }` and log one line. Never fall back
   to `NEXT_PUBLIC_API_URL`.
5. **Build the target URL** as `${API_URL}/${path}${search}` so the query
   string is kept exactly. Encode each path part again
   (`encodeURIComponent`) and drop a trailing `/` from `API_URL`.
6. **Forward only safe request headers:** `authorization`, `content-type`,
   `accept`, plus `x-forwarded-for` (so the backend's rate limit sees the real
   visitor). Do not forward `host`, `cookie`, `connection` or other
   hop-by-hop headers.
7. **Forward the body as raw bytes.** For anything other than GET/HEAD, use
   `await request.arrayBuffer()` instead of `request.text()`. Text decoding
   corrupts image uploads. Vercel caps a request body at 4.5 MB, so uploads
   must stay under that (the backend's own limit should match).
8. **Add a timeout:** `signal: AbortSignal.timeout(15_000)`, and set
   `cache: "no-store"` and `redirect: "manual"` (never follow a backend
   redirect somewhere else).
9. **Wrap the fetch in try/catch.** A timeout returns `504`
   `{ message: "The server took too long to answer" }`; any other network
   error returns `502` `{ message: "Could not reach the server" }`. Check
   the error by `name === "TimeoutError"`, not `instanceof Error` (a
   `DOMException` is not always an `Error`).
10. **Return the backend's answer.** Same status. Pass through `content-type`
    and `cache-control` only. For `204` and `304`, send a `null` body (a body
    on those statuses throws an error). Stream `upstream.body` instead of
    reading it into a string first.
11. **Unit test** the rules in `src/app/api/[...path]/route.test.ts` with a
    pretend `fetch` (no real backend).
12. Run `npm run lint`, `npx tsc --noEmit` and `npm test`.

## How to check (agent)

With `npm run dev` and the backend running, use `curl -i`:

| Request | Expect |
|---|---|
| `GET /api/v1/places` | 200, same JSON as calling the backend directly |
| `POST /api/v1/reviews` with no login | 401 from the backend |
| `POST /api/v1/reviews` with `Authorization: Bearer fake` | 401 |
| `GET /api/v1/places/not-a-real-id` | 404 |
| `GET /api/admin` or `GET /api/../secret` | 404, and nothing in the backend log |
| `GET /api/wikimedia-photo?...` | still works |

Report the status codes you got. Never use a real account or token.

## Team tests (live URL)

Open the site, browse places, write and delete a review with a photo, and
log in. Everything should feel the same as before.

**Change (2026-11-19, team request):** Ticket sharpened with step-by-step
agent instructions. Added path and method allowlists, raw-byte bodies for
uploads, a timeout with clear 502/504 errors, and 204 handling. The existing
ticks are kept; the new boxes are not ticked yet.

**Progress (2026-11-19, agent):** Built as above in
`src/app/api/[...path]/route.ts`, with 5 unit tests in `route.test.ts`
(path allowlist, safe headers, upload bytes unchanged, 204, 504/502, missing
`API_URL`). Checked with curl on localhost: `GET /api/v1/destinations` 200,
`POST /api/v1/reviews` without login 401 with the backend's sentence,
`/api/admin` and `/api/v1/..%2Fsecret` 404. `npm test` 90/90, `tsc`, ESLint
and `npm run build` pass. Not checked: a real photo upload (team test, needs
a login) and the live URL. Boxes stay unticked until the team confirms.

**Team confirmed (2026-11-20):** every box ticked on localhost. "Works on the live URL" stays open until the team checks the live site.
