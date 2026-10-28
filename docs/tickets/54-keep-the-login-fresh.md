# 54 — Keep the login fresh

**What to build:** A login runs out after about an hour. The NestJS backend gets a renew-login endpoint (POST /v1/auth/refresh) that takes the login's renewal code and answers with a renewed login. The website renews the login through it shortly before it runs out, and when it finds an expired login on opening the site, so travelers stay logged in until they log out. If the renewal is refused (for example after logging out on this device), the website quietly forgets the login and shows "Log in".

**Blocked by:** 53

**Status:** in progress (real renewal checked by the team on localhost 2026-10-28; live URL still to test)

- [x] A traveler who stays on the site, or comes back, after more than an hour is still logged in and can write a review
- [x] The renewal goes to the backend; the Network tab shows no /auth/v1/token request
- [x] A refused renewal shows "Log in" without an error message or a crash
- [x] The backend never logs or sends back anything but the renewed login
- [ ] Works on the live URL

**Progress (2026-10-28):** the backend has POST /v1/auth/refresh. It takes { refresh_token }, asks Supabase Auth for a renewed login, and answers { session } ("Cache-Control: no-store"); with no code it answers 400 "Please send the login renewal code.", and with a code that no longer works 401 "Your login has ended. Please log in again." The website renews the login through it a minute before it runs out, when it finds an expired login (for example on opening the site the next day), when the page is looked at again after sleeping, and before sending a review. Each renewal code works only once, so open tabs take turns (the browser's lock) and the second tab uses the login the first one renewed. Checked on localhost: the backend's 400 and 401 answers with curl. In the browser, with pretend backend answers (no real account): an expired login seen by two tabs at once was renewed with one request and both navbars showed "Hi, Maria"; a login running out in 65 seconds was renewed after about 5 seconds; a refused renewal forgot the login and showed "Log in" with no error. No requests went to Supabase. Lint, the website build and the backend type-check pass. Not checked yet: a real login kept for more than an hour, and the live URL.

**Checked by the team (2026-10-28):** POST /v1/auth/refresh tested in an API tool with a real login: the renewal code from the log-in answer gave 200 with a renewed login. Still to confirm: the website staying logged in for more than an hour, then the live URL.

**Checked by the team on localhost (2026-10-28):** with a real login, marking it as expired in the browser console and reloading made the website renew it through POST /v1/auth/refresh, and the traveler stayed logged in. Then the team wrote a review after the renewal, and a refused renewal showed "Log in" with no error. Code check: the backend logs only Supabase's error code and status (never a token or password), and the renew endpoint answers only { session }. Still to confirm: the live URL.
