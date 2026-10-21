# 38 — Sign up, log in and log out

**What to build:** A traveler can create an account with a display name, email and password, log in, and log out. The navbar shows "Log in" when logged out, and the traveler's display name with "Log out" when logged in. After logging in, the traveler goes back to the page they came from. Browsing never asks anyone to log in.

**Blocked by:** None

**Status:** done

**Decision (2026-10-21):** "Confirm email" is OFF in Supabase for the demo, so signing up logs the traveler in straight away. Turning it back on with a custom email sender is parked in docs/LATER.md.

- [x] The team decides whether Supabase's "Confirm email" setting stays on for the demo (its built-in emails only allow a few sign-ups per hour), and the decision is noted in this ticket
- [x] One Sign up / Log in page, with Sign up (display name, email, password) and Log in (email, password) modes
- [x] Wrong password or an email already in use shows a clear message, not a crash
- [x] The navbar shows "Log in", or the display name with "Log out"
- [x] Logging in from a detail page returns the traveler to that page
- [x] Staying logged in survives a page refresh
- [x] Every existing page still works without logging in
- [x] Works on the live URL

**Test notes (2026-10-21):** a wrong password shows "Wrong email or password." under the button. Signing up hit Supabase's email rate limit, which means "Confirm email" was still on in the dashboard. The team turned it off; signing up now works without emails, and signing up with an email that already has an account shows "That email already has an account".
