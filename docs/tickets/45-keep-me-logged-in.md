# 45 — "Keep me logged in" checkbox

**What to build:** Log in mode gains a "Keep me logged in" checkbox, unticked by default. Unticked, the traveler is logged out when they close the browser, which is useful on shared computers. Ticked, they stay logged in as before. Signing up follows the default: a new account is logged out when the browser closes.

**Decision (2026-10-23):** the team changed the default from ticked to unticked, so staying logged in is something the traveler chooses.

**Decision (2026-10-24):** when the traveler logs in with the box ticked, this browser also remembers their email (never the password). After logging out, the login page comes back with the email filled in and the box ticked. Logging in with the box unticked forgets the email.

**Blocked by:** None

**Status:** in progress (code written; waiting for the team to test with a real login)

**How it works:** unticked, the site remembers "end this login when the browser closes" and sets a cookie that the browser deletes on closing. On the next visit, if that cookie is gone, the site logs the traveler out before showing the page. Note: browsers set to "Continue where you left off" may keep that cookie after closing, so test with that setting off.

- [x] The checkbox shows in Log in mode, unticked by default
- [ ] Ticked: after closing and reopening the browser, the traveler is still logged in
- [ ] Unticked: after closing and reopening the browser, the traveler is logged out
- [x] After logging out from a ticked login, the login page shows the email filled in and the box ticked
- [ ] Refreshing the page or moving between pages never logs anyone out
- [ ] Works on the live URL
