# 105 — Thread care round: final check

**What to build:** The team walks through the "Thread care round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 100, 101, 102, 103, 104, 106

**Status:** todo

- [ ] Every item in the "Thread care round" checklist works on the live URL
- [ ] Reviews, replies, photos, reports, Helpful likes, profiles and log-in still work
- [x] /code-review has been run on the round and its findings handled
- [ ] Works on the live URL

**Progress (2026-11-07):** /code-review run on all uncommitted work since f8e823a (tickets 100–104 and 106). Re-checked: website and backend type-check, lint and `npm run build` pass; notifications has Row Level Security on with two policies; review_replies and reply_likes policies updated in 034; no secret keys, .env files, raw HTML, console.log or string-built SQL in the changes.

Findings (none must-fix): docs/SPEC.md's Data line still says the bell hears notifications through Realtime (it now listens to replies and Helpful marks and asks the backend, ticket 104 fix 2); ReviewReplies.tsx is 557 lines doing several jobs; the bell's click-outside / Escape code is copied from the profile menu; one stale comment ("#reply-<id>"); the bell asks the backend again for every reply or Helpful mark anywhere on the site (fine at this size). Waiting for the team's choice on which to fix.

Not checked: the live URL (after "commit and push").

**Review fixes (2026-11-07, team request "fix the spec note (2) and safety and standards (4)"):**
- docs/SPEC.md: a dated note on the notifications Data line saying the bell listens to replies and Helpful marks (not the notifications table) and why; and a line that notifications read on another device show as read on returning to the tab or opening the bell.
- The folding and "open the notified reply" logic moved to src/lib/thread-folding.ts, and the thread helpers (grouping answers, the page's copy of a delete) to src/lib/reply-threads.ts. ReviewReplies.tsx went from 557 to 448 lines and now only draws the thread and its forms.
- The click-outside / Escape code is one shared helper (src/lib/use-dismiss.ts), used by the profile menu and the bell.
- The stale "#reply-<id>" comment now says "?focus=reply-<id>"; one over-long comment line in the bell wrapped.
- docs/LATER.md: "From the thread care round code review" notes that the bell asks the backend on every reply or Helpful mark site-wide, and what to do if the site grows.

Checked: website type-check, lint and `npm run build`, backend type-check. In the browser on localhost (no data changed): the place page opened with ?focus= on a nested reply still opens its thread, scrolls to it and highlights it, and "Show replies" still opens a thread; on the home page the bell opens and Escape closes it and returns the keyboard to the bell, and the profile menu opens and a click outside closes it. Not checked: the live URL.

**Team check (2026-11-07, localhost):** the team confirmed the review fixes and the later fixes in the browser, the last being that scrolling the notifications no longer scrolls the page. Not checked yet: the live URL (after "commit and push").
