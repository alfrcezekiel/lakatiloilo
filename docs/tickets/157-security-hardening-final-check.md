# 157 — Security hardening final check

**What to build:** Verify on the live URL that the backend address is not visible in the browser, all existing features work (home, detail pages, reviews, login, admin dashboard), live updates continue to work, and photo uploads and display continue to work.

**Blocked by:** 156

**Status:** in progress

- [x] The backend address is not visible in browser JavaScript (check in DevTools)
- [x] The backend address is not visible in the browser network tab (all calls are to /api/*)
- [x] The home page loads and displays places correctly
- [x] Destination and accommodation detail pages load correctly
- [x] Reviews load and display correctly
- [x] Writing, editing, and deleting reviews work
- [x] Login and signup work
- [x] The admin dashboard loads and functions correctly
- [x] Supabase Realtime live updates still work
- [x] Photo uploads and display still work
- [x] The Content-Security-Policy header is present and enforced
- [x] Works on the live URL

**Why (plain English):** The last check of the round, on the real site
travelers use. Tickets 151–156 were each checked on their own; this one
proves they work together on Vercel, with the enforced CSP, after a hard
refresh, on a phone as well as a laptop.

**Before starting:** ticket 156 is pushed and the Vercel deploy is ready.
157 cannot pass while the live header still says "report-only".

## Agent steps (read-only on the live URL)

1. **Fix the live smoke test first.** `e2e/smoke/live.smoke.spec.ts`
   waits for the browser to call `api-lakat-iloilo.vercel.app/v1/reviews`;
   since ticket 152 the browser calls `/api/v1/reviews` on the website, so
   it cannot pass (found by reading the code; the browser tests could not
   run here, see below). Wait for the website's `/api/v1/reviews`
   instead, and add one read-only test: the home page answer has the
   `content-security-policy` header and no `-report-only` one.
2. **Header:** `curl -sI https://lakat-iloilo.vercel.app/` shows
   `content-security-policy:` with the policy from `docs/SPEC.md`.
3. **Address search in the live JavaScript** (works in Git Bash): download
   the home, a place, `/login` and `/admin/login` pages, every
   `/_next/static/...js` file they name, and search them for the backend
   host and `NEXT_PUBLIC_API_URL`. Expect 0.
4. **Proxy refusals** with curl: `GET /api/v1/destinations` 200,
   `POST /api/v1/reviews` with no login 401, `GET /api/admin` 404.
5. **Run `npm run test:smoke`** (read-only, allowed for the agent).
6. **Enforced CSP in the browser:** on the home page attach a
   `securitypolicyviolation` listener, try an image from
   `https://example.com` (blocked, "enforce"); every home image loads.
7. Never log in, write, upload or delete on the live site. Those are the
   team tests below.

## Team tests (live URL, laptop and phone)

Hard refresh (Ctrl+Shift+R), DevTools Console and Network open:
1. Network: every data request is `/api/v1/...`; Sources → search all
   files (Ctrl+Shift+F) for the backend host: no results.
2. Home, a destination and an accommodation load with their photos.
3. Log in and out; sign up only with the team's test account.
4. Write, edit and delete a review with a photo; like it; reply.
5. Two tabs on one place: a review in one appears in the other.
6. Admin dashboard: Overview, Reviews, Reports, Places (edit, photos),
   Categories, Trash.
7. The Console shows no "Refused to load" or "violates the following
   Content Security Policy" line.

**Progress (2026-11-20, agent, before 156 is pushed):** step 3 done on the
current live site: 24 JavaScript files (1.3 MB) from 4 pages contain no
backend host and no `NEXT_PUBLIC_API_URL`, and the HTML has none either.
Live header is still `content-security-policy-report-only` (156 not pushed).
`npm run test:smoke`: the page tests did not run on this computer
(Playwright's browser is not installed), so the earlier "fail" was not a
real result; the problem in step 1 was found by reading the code. Remaining steps wait for the push.

**Change (2026-11-20, team request after code review):** step 1 done: the live smoke test is fixed and has the proxy and enforced-CSP checks. Run on the live site (2026-11-20): the proxy, API refusal and API header tests pass; the CSP check fails as expected until ticket 156 is live; the 4 page tests did not run (Playwright's browser is not installed on this computer: `npx playwright install chromium`).

**Incident (2026-11-20):** `CORS_ORIGIN` was removed from the backend's
Vercel variables before the backend code that makes it optional was
pushed, so the live backend refused to start ("CORS_ORIGIN is not set")
and every data request answered 500 for a few minutes. Cause: the agent's
instruction put the variable change before the push; it must come after.
Fixed by the team re-adding `CORS_ORIGIN` and redeploying. Order from now
on: push the code, check the live site, then delete `CORS_ORIGIN` and
redeploy the backend.

**Smoke run after the fix (2026-11-20, browser installed):** 6 passed, 1
failed: the enforced-CSP check, as expected until ticket 156 is pushed.

**Progress (2026-11-20, agent, after commit 28c8bc7 went live):**
- Step 1: `npm run test:smoke` 7/7 pass on the live site.
- Step 2: the live header is `content-security-policy` (enforced), with
  only our Supabase project named.
- Step 3: 24 JavaScript files from 4 pages: 0 hits for the backend host or
  `NEXT_PUBLIC_API_URL`; 0 in the HTML.
- Step 4: `GET /api/v1/destinations` 200, `POST /api/v1/reviews` without
  login 401, `GET /api/admin` 404.
- Step 6: home page, 57 images, none broken; an example.com image is
  blocked ("enforce").
Still to do: the team tests above (laptop and phone), then delete
`CORS_ORIGIN` from the backend's Vercel variables and `backend/.env`,
redeploy the backend, and rerun the smoke tests.

**Progress (2026-11-20, agent):** the team deleted `CORS_ORIGIN` and
redeployed the backend. Live smoke 7/7 pass. A browser permission check
(OPTIONS from the website's own origin) gets no `Access-Control-Allow-Origin`:
CORS is off, as intended. Team question answered: the
`content-security-policy-report-only` header on `thumb.wikimedia.org` image
responses is Wikimedia's own header on its files, not ours, and has no
effect on our pages.

**Team confirmed (2026-11-20, live URL):** tested on the live site; all boxes ticked.

**Team question (2026-11-20):** React error #418 (hydration text mismatch)
on the live home page. Not reproduced in 15 clean Playwright loads (laptop,
phone, Manila time, pretend login). Gone in an Incognito window, so it came
from the tester's browser (an extension or auto-translate changing page
text before React hydrated), not from the app. No code change.
