# 45 — "Remember my email" checkbox

**What to build:** Log in mode gains a "Remember my email" checkbox, unticked by default.

- Travelers always stay logged in until they press Log out, including after closing and reopening the browser, whether or not they tick the box.
- **Ticked:** this browser remembers their email (never the password). After logging out, the login page comes back with the email filled in and the box ticked.
- **Unticked:** any remembered email is forgotten.
- Signing up has no checkbox and leaves any remembered email alone.

**Blocked by:** None

**Status:** in progress (changed and checked on localhost 2026-10-24; not pushed yet, so it still needs testing on the live URL)

**Decisions:**
- 2026-10-23: the box starts unticked.
- 2026-10-24: a ticked login remembers the email; an unticked login forgets it.
- 2026-10-24: unticked travelers also stay logged in after closing the browser. Since the box no longer decides whether anyone is logged out, it was renamed from "Keep me logged in" to "Remember my email", so the label says what it does.

**How it works:** Supabase keeps travelers logged in until they log out. The box only saves or forgets the email in this browser's storage, and the login page reads it back when it opens.

- [x] The checkbox shows in Log in mode, unticked by default, labelled "Remember my email"
- [ ] Ticked or unticked: after closing and reopening the browser, the traveler is still logged in
- [ ] Ticked: after logging out, the login page shows the email filled in and the box ticked
- [ ] Unticked: after logging out, the login page shows an empty email field
- [x] Refreshing the page or moving between pages never logs anyone out
- [ ] Works on the live URL

**History (2026-10-24):** this ticket started as "Keep me logged in", where unticked travelers were logged out when they closed the browser. A cookie-only check did not work in Brave (it keeps such cookies when it reopens old tabs); a 2-minute heartbeat was tried and removed; a check when pages open worked on the live URL. The team then decided unticked travelers should stay logged in too, so all of that was removed and the box renamed.
