# 92 — Catching up after sleep or a dropped connection

**What to build:** When a phone wakes up, a background tab comes back to the front, or the connection drops and returns, the open page catches up by itself: it asks the backend once for what it shows (places, ratings, the place, its reviews), so changes made in the meantime appear without a reload. Nothing shows to the traveler while it catches up.

**Blocked by:** 89

**Status:** todo

- [x] Changes made while the tab was in the background show when it comes back to the front
- [x] Changes made while the connection was off (for example "Offline" in the browser's tools) show when it comes back
- [x] Coming back asks the backend once, not repeatedly
- [ ] Works on the live URL, including on a phone after it sleeps

**Progress (2026-11-02):** the doorbell helper now also rings once to catch up: when Supabase Realtime reconnects after a drop (always), and when the tab comes back into view or the browser is back online. Catch-ups within 5 seconds of each other count as one, on top of the half-second quiet time, so coming back asks the backend once. The reviews skip the "back in view / back online" part because TanStack Query already fetches them again then (its default); they still catch up after a Realtime reconnect. Website only.

Checked, in the browser on the team's running home page:
- "Tab back in view" and "back online" fired together: one request to the server. Another "back online" one second later: none.
- Closing the page's live Supabase connection: Supabase reconnected by itself and the page asked the server once.
- Website type-check, lint and `npm run build` pass.

Not checked: a real phone going to sleep, a real background tab and the browser's "Offline" switch (these were imitated with the browser's own events), and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** with an open page, the team changed an accommodation's name with SQL while the tab was in the background, and again while Chrome was set to "Offline". Both times the new name appeared by itself on coming back, without a reload. Still to check: the live URL and a phone after it sleeps (ticket 93).
