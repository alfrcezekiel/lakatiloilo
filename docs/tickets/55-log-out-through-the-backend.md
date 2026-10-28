# 55 — Log out through the backend

**What to build:** The NestJS backend gets a log-out endpoint (POST /v1/auth/logout) that ends the traveler's login on this device only, so its renewal code stops working, and answers "You're logged out." The navbar's "Log out" calls it, then the website forgets its copy of the login and shows "Log in". If the backend cannot be reached, the traveler is still logged out in this browser.

**Blocked by:** 53

**Status:** done (tested by the team on the live URL, 2026-10-28)

- [x] "Log out" sends a request to the backend (no /auth/v1/logout in the Network tab) and the navbar shows "Log in"
- [x] After logging out, the old login no longer works for writing a review or for renewing
- [x] Logging out on one device leaves the same account logged in on another device
- [x] With the backend unreachable, "Log out" still shows "Log in"
- [x] Works on the live URL

**Progress (2026-10-28):** the backend has POST /v1/auth/logout. It takes the traveler's login token and asks Supabase Auth to end that login on this device only ("local"), using only the traveler's own token and the publishable key, then answers { message: "You're logged out." }; without a valid login it answers 401 "Please log in, then try again." The navbar's "Log out" (in the bar and in the phone menu) now forgets the website's copy straight away, so the page shows "Log in" at once, and sends the login to that endpoint. A login that has run out is renewed first, because Supabase only ends a login it still accepts. Checked on localhost: 401 with no login and with a fake one (curl). In the browser, with pretend backend answers (no real account): Log out sent POST /v1/auth/logout with the login, the navbar showed "Log in" and the saved login was gone, with no request to Supabase; the same from the phone menu; with the backend unreachable the traveler was still logged out, with no error. Lint, the website build and the backend type-check pass. Not checked yet with a real account: that the old login no longer works for a review or a renewal, that another device stays logged in, and the live URL.

**Checked by the team on localhost (2026-10-28):** a real log-out sent POST /v1/auth/logout (200) and the navbar showed "Log in"; the old login then got 401 from GET /v1/auth/me (the same check reviews use), and another device stayed logged in. Then the old renewal code got 401 from POST /v1/auth/refresh after logging out, and with the backend stopped, Log out still showed "Log in" with no error. 

**Checked by the team on the live URL (2026-10-28):** Log out went to POST /v1/auth/logout (200), the navbar showed "Log in", and the old login then got 401 from GET /v1/auth/me.
