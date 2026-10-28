# 53 — The website keeps its own login, and asks the backend who is logged in

**What to build:** After a successful log-in, the website keeps the login itself instead of handing it to Supabase's browser library, so the browser no longer asks Supabase Auth to check it. The NestJS backend gets a "who is logged in" endpoint (GET /v1/auth/me) that answers with the traveler's id, display name, traveler type and email. The navbar's "Hi, <name>" and the Reviews section (Edit and Delete on the traveler's own review) use it. Writing, editing and deleting reviews send the website's own copy of the login. Other open tabs notice logging in and out. Until ticket 55, Log out simply forgets the login in this browser. Travelers who were logged in before this goes live log in once more.

**Blocked by:** None

**Status:** in progress (real log-in checked by the team on localhost 2026-10-28; live URL still to test)

- [x] Logging in sends no request to Supabase Auth (no /auth/v1/user in the Network tab), and the traveler goes back to the page they came from
- [x] The navbar shows "Hi, <name>" from the backend's "who is logged in" endpoint; without a valid login it answers 401 and the navbar shows "Log in"
- [ ] Writing, editing and deleting a review still work, and the traveler's own review still shows Edit and Delete
- [ ] Logging in or out in one tab updates the navbar in other open tabs
- [ ] "Remember my email", Forgot password and Set new password still work, and a reset link never shows the traveler as logged in
- [ ] Works on the live URL

**Progress (2026-10-28):** the backend has GET /v1/auth/me. It reads the login token (the shared "log in first" check now used by reviews too), asks Supabase Auth whose it is, and answers { id, email, display_name, traveler_type } with "Cache-Control: no-store"; without a valid login it answers 401 "Please log in, then try again." The website keeps its own copy of the login in this browser after logging in (no longer handing it to Supabase's browser library), and the navbar, the Reviews section and review writing use it. If the backend refuses the login (401), the website forgets it and shows "Log in"; if the backend cannot be reached, the navbar falls back to the name inside the login. Until ticket 55, Log out only forgets the login in this browser. Checked on localhost: GET /v1/auth/me answers 401 with no login and with a fake one, and the browser is allowed to send it the login header. In the browser, with pretend backend answers (no real account): logging in saved the login and went on to the ?next= page with no Supabase request and no Supabase cookie; the navbar showed "Hi, Maria" from the backend in two open tabs; Log out in one tab switched both to "Log in"; a login the backend refused was forgotten. Lint, the website build and the backend type-check pass. Not checked yet: a real log-in, writing a review with the website's own login, and the live URL. One rare case still talks to Supabase: if a traveler opens a reset link and leaves without saving, the next page removes that reset login with Supabase.

**Checked by the team on localhost (2026-10-28):** a real log-in sent no /auth/v1/user request, the navbar showed their name from GET /v1/auth/me, and writing and editing a review worked. Still to confirm: deleting a review, two open tabs, "Remember my email" and Forgot password, then everything on the live URL.
