# 156 — CSP enforced

**What to build:** Switch the Content-Security-Policy header from report-only mode to enforced mode. The browser now blocks any resources that violate the policy.

**Blocked by:** 155

**Status:** in progress

- [x] Content-Security-Policy header is switched from report-only to enforced mode
- [x] The policy string is the same as in report-only mode
- [x] The browser blocks resources that violate the policy
- [x] All legitimate features still work (no regressions from the testing phase)
- [x] Works on the live URL

**Why (plain English):** Until now the CSP only *warned*. Enforced means the
browser really refuses anything not on the list: a script an attacker
sneaks into a page, an image or a connection to a site we never named.
Ticket 155 proved the list already covers everything the app uses, so this
is a one-word change, but the riskiest one in the round: a missed address
would now be a missing photo or dead live updates instead of a warning.

## Agent steps

1. **One change in `src/proxy.ts`:** `CSP_HEADER` becomes
   `"Content-Security-Policy"`. The policy list stays exactly the same
   (box 2). Update the comment above it: enforced since 156, and how to
   switch back to report-only in an emergency.
2. **Unit test** `src/proxy.test.ts`: the enforced header is set and the
   report-only one is not; the needed hosts (Supabase https and wss,
   `blob:`, Wikimedia, Unsplash) are there; no `'unsafe-eval'` outside
   development; the admin "not found" answer has the header too, without
   calling the backend.
3. **Production build check** (`npm run build`, `npx next start -p 3100`):
   - `curl -sI` shows `content-security-policy:` and no `-report-only`;
   - in the browser, attach a `securitypolicyviolation` listener, then try
     a script, image and `fetch` from `https://example.com`: all three are
     reported with disposition `enforce` and do not load; a WebSocket to
     Supabase Realtime is not reported;
   - on each page: no broken images, every script loaded (the `nomodule`
     polyfill is skipped by modern browsers, that is normal), and a click
     works (React hydrates content when needed, not all at once; the live
     site does the same, so count markers only after an interaction).
4. Run `npx tsc --noEmit`, ESLint, `npm test` and `npm run build`.
5. Never log in with a real account; logged-in screens are team tests.

**Progress (2026-11-20, agent):** Done as above. `npm test` 94/94 (4 new
in `src/proxy.test.ts`; the first fails on the old report-only header).
Production build on :3100: header enforced; example.com script, image and
fetch blocked ("enforce"); Supabase Realtime address allowed. Home (57
images), two destinations, an accommodation, log in, forgot password,
credits and admin sign-in: no broken images, every script loaded. On a
place page a click opened the photo viewer and the page hydrated fully.
The dev server (:3000) also sends the enforced header (with dev-only
`'unsafe-eval'`). Not checked: logged-in screens, live updates arriving,
photo uploads and the live URL (team tests below). Ticket 155's live URL
box is still open: test 155 on the live site first, then push this.

## Team tests (localhost, then the live URL)

Hard refresh (Ctrl+Shift+R). DevTools → Network → the page request →
Response Headers shows `content-security-policy` (no "report-only"). Keep
the Console open and repeat ticket 155's tests: two tabs for live updates
(reviews, likes, replies, notifications), a review with a photo (preview and
saved), log in and out, and the admin dashboard (places, photos, reports,
categories, Trash). Any "Refused to load…" or "violates the following
Content Security Policy" line means something is now blocked: copy it to
me.

**Team confirmed (2026-11-20, localhost):** the header is now `Content-Security-Policy` (enforced). Reviews, likes and replies in two tabs still work and stay up to date (live updates), and the admin side still works. Every box ticked except "Works on the live URL" (not pushed or tested there yet).

**Team confirmed (2026-11-20, live URL):** tested on the live site; all boxes ticked.
