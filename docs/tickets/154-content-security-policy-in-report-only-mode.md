# 154 — Content-Security-Policy in report-only mode

**What to build:** A Content-Security-Policy (CSP) header, set in
`src/proxy.ts`, in **report-only** mode. It allows our own scripts and
styles, images from Supabase Storage and Wikimedia, and connections to
Supabase (including Realtime). Nothing is blocked yet; the browser only
warns.

**Why (plain English):** A CSP is a list the website gives the browser:
"only load scripts, images and connections from these places." If an
attacker sneaks a script into a page, the browser refuses to run it.
*Report-only* means the browser just prints a warning in the console
instead of blocking, so we can find what we forgot before we switch it on
for real in ticket 156.

**Blocked by:** 153

**Status:** done

- [x] Content-Security-Policy header is added in report-only mode
- [x] The policy allows scripts from 'self' and 'unsafe-inline'
- [x] The policy allows styles from 'self' and 'unsafe-inline'
- [x] The policy allows images from 'self', data:, https://*.supabase.co, and https://upload.wikimedia.org
- [x] The policy allows connections to 'self' and https://*.supabase.co
- [x] The policy blocks frames and restricts base-uri and form-action to 'self'
- [x] The CSP is in report-only mode (violations are reported but not blocked)
- [x] `img-src` also allows `https://thumb.wikimedia.org` and `https://images.unsplash.com` (the home page loads from both)
- [x] `connect-src` also allows `wss://*.supabase.co` (Realtime uses a WebSocket)
- [x] The policy adds `frame-ancestors 'none'` and `object-src 'none'`
- [x] `'unsafe-eval'` is added in development only (`npm run dev` needs it), never in production
- [x] The comment in `next.config.ts` points to `src/proxy.ts` instead of `docs/LATER.md`
- [ ] Works on the live URL

## Agent steps

1. **Read first:** `src/proxy.ts` (the CSP string and the `matcher`),
   `next.config.ts` (the other security headers), `src/lib/realtime.ts`
   (around line 94, `supabase.channel`).
2. **Build the policy from a list**, one directive per line, joined with
   `"; "`, so the team can read and change it:
   ```
   default-src 'self'
   script-src 'self' 'unsafe-inline'   (+ 'unsafe-eval' only when NODE_ENV === "development")
   style-src 'self' 'unsafe-inline'
   img-src 'self' data: blob: https://*.supabase.co https://upload.wikimedia.org
           https://thumb.wikimedia.org https://images.unsplash.com
   font-src 'self'
   connect-src 'self' https://*.supabase.co wss://*.supabase.co
   frame-src 'none'
   frame-ancestors 'none'
   object-src 'none'
   base-uri 'self'
   form-action 'self'
   ```
   `blob:` lets the review form preview a photo before upload.
   `thumb.wikimedia.org` serves the resized place photos and
   `images.unsplash.com` the hero and category photos (both found by the
   report-only warnings on the home page).
3. **Keep it report-only:** header name `Content-Security-Policy-Report-Only`.
   Ticket 156 renames it.
4. **Check the matcher.** It skips `api`, `_next/static`, `_next/image` and
   `favicon.ico`. That is fine: those are not HTML pages. Make sure the
   header is also set on the admin-redirect response, not only on `next()`.
5. **Fix the stale comment** in `next.config.ts`.
6. **Do not add** `upgrade-insecure-requests` or a report endpoint in this
   ticket. Park a `/api/csp-report` endpoint in `docs/LATER.md` if the team
   wants one.
7. Run `npm run lint` and `npx tsc --noEmit`.

## How to check (agent)

```bash
curl -sI http://localhost:3000/
```
Repeat for a place page and `/admin/login`. Each shows
`Content-Security-Policy-Report-Only` with the directives above. Then open
those pages in the built-in browser and read the console: list every
`[Report Only]` warning in the progress note (these are ticket 155's input).

## Team tests (live URL)

Hard refresh. Open DevTools → Network → the page request → Response Headers,
and find `Content-Security-Policy-Report-Only`. Use the site normally;
nothing should break, because report-only blocks nothing.

**Change (2026-11-19, team request):** Ticket sharpened with step-by-step
agent instructions. The CSP lives in `src/proxy.ts` (not `next.config.js`).
Added `wss://*.supabase.co` for Realtime, `blob:` for photo previews,
`frame-ancestors 'none'`, `object-src 'none'`, and dev-only
`'unsafe-eval'`. The existing ticks are kept; the new boxes are not ticked yet.

**Progress (2026-11-19, agent):** The policy is a list (`CSP`) in
`src/proxy.ts`, set on every page response, including the admin "not
found" rewrite. The admin check now matches `/admin` and `/admin/...` only
(not `/administrators`), like the old matcher. `curl -sI` on `/` shows the
header with every directive. The home page's report-only warnings showed
`thumb.wikimedia.org` and `images.unsplash.com` were missing; both added.
After that, a test image from Wikimedia passes and one from an unknown
site is reported. `next.config.ts` comment fixed. Not checked: place
pages, admin pages and live updates (ticket 155), and the live URL.

**Team confirmed (2026-11-20):** every box ticked on localhost. "Works on the live URL" stays open until the team checks the live site.
