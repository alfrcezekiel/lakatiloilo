# 55 — Log out through the backend

**What to build:** The NestJS backend gets a log-out endpoint (POST /v1/auth/logout) that ends the traveler's login on this device only, so its renewal code stops working, and answers "You're logged out." The navbar's "Log out" calls it, then the website forgets its copy of the login and shows "Log in". If the backend cannot be reached, the traveler is still logged out in this browser.

**Blocked by:** 53

**Status:** todo

- [ ] "Log out" sends a request to the backend (no /auth/v1/logout in the Network tab) and the navbar shows "Log in"
- [ ] After logging out, the old login no longer works for writing a review or for renewing
- [ ] Logging out on one device leaves the same account logged in on another device
- [ ] With the backend unreachable, "Log out" still shows "Log in"
- [ ] Works on the live URL
