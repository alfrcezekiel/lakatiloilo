# 91 — A detail page's own details update live

**What to build:** On an open destination or accommodation page, changing that place in the Supabase Table Editor (name, photo, description, address, contact) updates the page by itself within a few seconds. If the place is removed, the page shows the existing "not found" message. Changes to other places do not refresh this page. The scroll position, a review being typed and open pop-ups stay as they are.

**Blocked by:** 89

**Status:** todo

- [x] Changing a place in the Table Editor updates its open detail page within a few seconds, on both page types
- [x] Removing the place shows "not found" with the Back to Home button
- [x] Changing a different place does not refresh this page
- [x] The scroll position and a review being typed are kept when an update arrives
- [ ] Works on the live URL

**Progress (2026-11-02):** the doorbell helper can now listen to one kind of change and to rows matching a filter Supabase applies (for example "id=eq.<id>"). A new invisible LivePlace component on both detail pages listens to edits of this one place and to deletions in its table, and on a ring asks the Next.js server to load the place again (a server refresh); a removed place then shows the usual "not found". Supabase cannot filter deletions, so removing any place of the same kind also refreshes the page once, with no visible change. No SQL.

Checked, in the browser on the team's running website:
- An accommodation page joined two Realtime channels: "accommodations UPDATE where id = this place" plus "accommodations DELETE", and "reviews, review_likes, review_replies"; Supabase answered "Subscribed to PostgreSQL" for both (the filter was accepted).
- Triggering the same refresh the doorbell uses: one request to the server, the title and the scroll position (644 px) stayed.
- Website type-check, lint and `npm run build` pass.

Not checked: that a review being typed is kept through the refresh. With a pretend login the refresh dropped the pretend login (the form changed to "Log in to write a review"); this happened twice, so the check was stopped as the team rules ask. Likely a pretend-login artifact (the same refresh kept the home page's search text in ticket 90), but not proved. Needs the team with a real login. Also a real Table Editor change and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** with a real login, changing the open place in the Table Editor updated its page within a few seconds and kept a half-written review; changing a different place did not change the page; removing the place showed "not found". So the earlier lost form was a pretend-login artifact. "Works on the live URL" stays open until ticket 91 is pushed and checked there.
