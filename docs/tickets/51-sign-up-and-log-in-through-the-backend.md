# 51 — Sign up and log in through the backend

**What to build:** The NestJS backend gets endpoints to create an account (display name, traveler type, email, password) and to log in. The Sign up / Log in page uses them. After logging in or signing up, the browser keeps the login exactly as before, so the navbar shows the traveler's name and "Remember my email" still works. Forgot password, Set new password and Log out stay in the browser.

**Blocked by:** 49

**Status:** todo

- [ ] Creating an account through the backend works, and the new account has its display name and traveler type
- [ ] Logging in through the backend works, and the traveler goes back to the page they came from
- [ ] A wrong password, an email that already has an account, a weak password and "too many tries" show the same plain messages as before
- [ ] The backend never stores, logs or sends back the password
- [ ] Log out, Forgot password and "Remember my email" still work
- [ ] Works on the live URL
