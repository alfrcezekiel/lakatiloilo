# 155 — CSP testing with Supabase features

**What to build:** Test the CSP report-only mode to ensure it does not block Supabase Realtime (live updates arrive), review photos load from Supabase Storage, place photos load from Supabase Storage and Wikimedia, and Next.js scripts and styles work correctly. Adjust the policy if needed.

**Blocked by:** 154

**Status:** in progress

- [x] Supabase Realtime live updates still arrive (test by adding a review in another tab)
- [x] Review photos load from Supabase Storage
- [x] Place photos load from Supabase Storage
- [x] Wikimedia images load on the home page
- [x] Next.js scripts and styles work correctly
- [x] The admin dashboard functions correctly
- [x] No CSP violations are reported in the browser console for legitimate features
- [x] If violations occur, the policy is adjusted and tested again
- [x] Works on the live URL

**Why (plain English):** Ticket 154 turned the CSP on in "only warn" mode.
Before ticket 156 makes the browser really block, we prove nothing the app
needs is on the wrong side of the list. A missed address now is a console
warning; after 156 it would be a missing photo or dead live updates.

## Agent steps

1. **Test a production build**, not `npm run dev`: dev adds `'unsafe-eval'`,
   so only a build shows what the live site does. `npm run build`, then
   `npx next start -p 3100` (leave the team's dev server on 3000 alone).
2. **Collect violations with `ReportingObserver`**, not the console (the
   browser pane's console reader misses some messages). On each page, after
   it loads and is scrolled to the bottom, run:
   ```js
   const o = new ReportingObserver(() => {}, { types: ["csp-violation"], buffered: true });
   o.observe(); o.takeRecords().map(r => r.body.effectiveDirective + " " + r.body.blockedURL)
   ```
   `buffered: true` also returns warnings from before it was created. First
   prove it works with an image from `https://example.com` (it must be listed).
3. **Pages:** home, a destination with a Supabase photo, one without, an
   accommodation, `/login`, `/forgot-password`, `/reset-password`,
   `/credits`, `/admin/login`, and `/admin/...` logged out (the 404 page).
4. **Probes for what a page does not do on its own:** a `WebSocket` to
   `wss://<project>.supabase.co/realtime/v1/websocket` (Realtime), a
   `blob:` image (photo preview before upload), a Supabase
   `/storage/v1/render/image/...` image (review photo previews). Each must
   give no violation, while `wss://example.com` must give one.
5. **If a violation appears:** add only that host to the matching directive
   in `src/proxy.ts`, with a comment saying what needs it, and update the
   policy in `docs/SPEC.md`. Never add `*` or `https:`.
6. Never log in with a real account. Logged-in screens are team tests.

**Progress (2026-11-20, agent):** Production build on localhost:3100,
violations read with `ReportingObserver` (checked first with an
example.com image, which was listed):
- 0 violations on all 10 pages in step 3; no broken images (home 56
  images, from our site, Unsplash and Supabase Storage).
- Realtime: the Supabase WebSocket passes; `wss://example.com` and a
  `fetch` to example.com are reported (`connect-src`).
- A `blob:` preview image loads, and a Supabase resized-image address
  passes.
- Place photos from Wikimedia reach the browser through
  `/api/wikimedia-photo` in production (our own site), so `img-src` needs no
  Wikimedia host there; `thumb.wikimedia.org` stays for `npm run dev`.
- No policy change needed.

Not checked (team tests, need real logins): live updates actually
arriving, a review with a photo (writing and viewing), and the logged-in
admin dashboard. No page in the data had a review photo to look at.

## Team tests (localhost, then the live URL)

Hard refresh, open DevTools → Console, and keep it open:
1. Two tabs on the same place. Write a review in one; it appears in the
   other within a few seconds (live updates).
2. Add a photo to the review: the preview shows before saving, and the
   photo shows after.
3. Log in to the admin dashboard, open Overview, Reviews, Reports,
   Places (edit one, look at its photos), Categories and Trash.
4. On every step, the console must show no line starting with
   `[Report Only]` or "violates the following Content Security Policy".
   If one does, copy it to me.

**Team confirmed (2026-11-20):** live updates (notifications, reviews, likes, replies), the admin dashboard (adding and editing places, photos, reports, categories, Trash) all work, with no CSP violations in the browser console, on localhost. Every box ticked except "Works on the live URL" (not tested there yet).

**Team confirmed (2026-11-20, live URL):** tested on the live site; all boxes ticked.
