# 47 — Login extras: final check

**What to build:** The team walks through the "Login extras round" checklist in the spec on the live URL, on a laptop and on a phone, and ticks it off.

**Blocked by:** 43, 44, 45, 46

**Status:** in progress (not pushed yet, so the live URL checks are still open)

**Notes (2026-10-24):** the login, Forgot password and Set new password pages were checked at phone width (375 px): tidy, no sideways scrolling. /code-review ran on the uncommitted round: no must-fix items; one spec gap (an abandoned reset link leaves the traveler logged in, fixed in ticket 46) and two tidy-ups, both fixed: the log-in page now shares one page frame with the Forgot password and Set new password pages (B1), and the 8-character password rule lives in one place (B2).

- [ ] Every item in the "Login extras round" checklist works on the live URL
- [x] The login page looks tidy on a phone with all the new parts
- [ ] Existing sign-up, log-in, log-out and reviews still work
- [x] /code-review has been run on the round and its findings handled
- [ ] Works on the live URL
