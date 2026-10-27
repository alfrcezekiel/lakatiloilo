# 51 — Sign up and log in through the backend

**What to build:** The NestJS backend gets endpoints to create an account (display name, traveler type, email, password) and to log in. The Sign up / Log in page uses them. Creating an account does not log the traveler in (they log in themselves). After logging in, the browser keeps the login exactly as before, so the navbar shows the traveler's name and "Remember my email" still works. Forgot password, Set new password and Log out stay in the browser.

**Blocked by:** 49

**Status:** done (2026-10-27, confirmed by the team)

- [x] Creating an account through the backend works, and the new account has its display name and traveler type
- [x] Creating an account shows an "Account created" pop-up and does not log the traveler in; "Go to log in" opens Log in with empty fields
- [x] Logging in through the backend works, and the traveler goes back to the page they came from
- [x] A wrong password, an email that already has an account, a weak password and "too many tries" show the same plain messages as before
- [x] The backend never stores, logs or sends back the password
- [x] Log out, Forgot password and "Remember my email" still work
- [x] Works on the live URL

**Progress (2026-10-27):** the NestJS backend has POST /v1/auth/signup and POST /v1/auth/login. They call Supabase Auth (the login service, not the data API) with a fresh client for each request, and answer with the login; the browser stores it with supabase.auth.setSession, so it is logged in exactly as before. Refusals carry Supabase's own code, so the login form's existing messages still apply. The password is never stored, logged or sent back. Checked on localhost without a real account: a bad email, a one-letter display name, no traveler type and a 5-character password are refused with plain messages (400); a wrong password for a made-up address answers "invalid_credentials", and the login page showed "Wrong email or password." with one request to localhost:5000/v1/auth/login and none to Supabase.

**Change (2026-10-27, team request):** creating an account no longer logs the traveler in. The backend ends the login Supabase makes for a new account and answers { created: true, needs_confirmation }; the form shows an "Account created" pop-up (the same pop-up as "Password changed") with "Go to log in", which opens Log in with the new email filled in. Checked on localhost with a pretend "created" answer from the backend (no real account was made): the pop-up showed "Welcome to Lakat Iloilo, Juan! Your account is ready...", no login was kept, and "Go to log in" opened Log in with the email filled in. Not checked yet: a real sign-up, including that the backend really ends Supabase's login. Later the same day the team checked a real sign-up: the pop-up showed and they stayed logged out. At their request, "Go to log in" now opens Log in with empty fields (no email filled in), so travelers type their own details.

