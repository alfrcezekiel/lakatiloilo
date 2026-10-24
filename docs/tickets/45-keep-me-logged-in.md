# 45 — "Keep me logged in" checkbox

**What to build:** Log in mode gains a "Keep me logged in" checkbox, unticked by default.

- **Unticked:** when the traveler closes the browser and opens the site again, they are logged out. Useful on shared computers.
- **Ticked:** they stay logged in after closing the browser, and this browser remembers their email (never the password), so after logging out the login page comes back with the email filled in and the box ticked.
- Signing up has no checkbox and follows the default: a new account is logged out when the browser closes.

**Blocked by:** None

**Status:** in progress (code rewritten and checked on localhost 2026-10-24; not pushed yet, so the unticked case still needs testing on the live URL)

**Decisions:**
- 2026-10-23: the default is unticked, so staying logged in is something the traveler chooses.
- 2026-10-24: a ticked login remembers the email; an unticked login forgets it.
- 2026-10-24: no timers ("heartbeat") running in open tabs. The site works out that the browser was closed only when a page opens.

**How it works:** a website is never told "the browser closed", so the site works it out the next time a Lakat Iloilo page opens. An unticked login counts as over, and the traveler is logged out before the page shows them as logged in, when either:

1. the browser deleted the site's "browser is open" cookie, which browsers do when they close; or
2. the last Lakat Iloilo page was closed more than 10 seconds ago, and no other Lakat Iloilo tab is still open. Each page notes the time as it closes, and answers when a new page asks "anyone still open?". This catches Brave, Chrome and Edge set to "Continue where you left off", which keep that cookie after closing.

Refreshing comes back within 10 seconds, and moving between pages does not close anything, so neither logs anyone out.

**Known limit:** closing the last Lakat Iloilo tab while the browser stays open, then opening the site again more than 10 seconds later, also counts as closing and logs an unticked traveler out.

- [x] The checkbox shows in Log in mode, unticked by default
- [x] Ticked: after closing and reopening the browser, the traveler is still logged in
- [ ] Unticked: after closing and reopening the browser, the traveler is logged out
- [x] After logging out from a ticked login, the login page shows the email filled in and the box ticked
- [x] Refreshing the page or moving between pages never logs anyone out
- [ ] Works on the live URL

**History (2026-10-24):** the first version relied only on the "browser is open" cookie. On the live URL, Brave kept that cookie after closing, so an unticked traveler stayed logged in. A 2-minute heartbeat (open tabs noting the time every 20 seconds) was tried next and removed at the team's request, in favour of the rule above.

**Checked on localhost (2026-10-24):** with fake markers instead of a real login. A page closed 60 seconds earlier with no other Lakat tab open: logged out. A refresh: still logged in. A page closed 60 seconds earlier but another Lakat tab open: still logged in. The "browser is open" cookie gone: logged out.
