# 56 — Own login round: final check

**What to build:** The team walks through the "Own login round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 53, 54, 55

**Status:** in progress (2026-10-28)

- [ ] Every item in the "Own login round" checklist works on the live URL
- [ ] Existing browsing, reviews, sign-up, log-in, log-out and password reset still work
- [x] /code-review has been run on the round and its findings handled
- [ ] Works on the live URL

**Progress (2026-10-28):** /code-review ran on the round (from 8852dea). No must-fix findings. Handled: a renewal that fails for a passing reason (Supabase busy or down) no longer logs the traveler out; the website keeps the name inside the login and tries again every 30 seconds (never in a tight loop). Old Supabase logins left in the browser (from before this round, or an unused reset link) are ended through the backend's log-out endpoint and deleted on any page except the password-reset pages, so no normal page talks to Supabase Auth; the spec says so. The login code moved into its own file, apart from "Remember my email" and the reset helpers. Checked on localhost with pretend backend answers: a 503 renewal kept the traveler logged in with retries 30 seconds apart; an old Supabase cookie was deleted and sent to /v1/auth/logout with no request to Supabase; the Set new password page kept it. Lint, the website build and the backend type-check pass. Still to do: the team's walk through the "Own login round" checklist on the live URL, laptop and phone.
