# 54 — Keep the login fresh

**What to build:** A login runs out after about an hour. The NestJS backend gets a renew-login endpoint (POST /v1/auth/refresh) that takes the login's renewal code and answers with a renewed login. The website renews the login through it shortly before it runs out, and when it finds an expired login on opening the site, so travelers stay logged in until they log out. If the renewal is refused (for example after logging out on this device), the website quietly forgets the login and shows "Log in".

**Blocked by:** 53

**Status:** todo

- [ ] A traveler who stays on the site, or comes back, after more than an hour is still logged in and can write a review
- [ ] The renewal goes to the backend; the Network tab shows no /auth/v1/token request
- [ ] A refused renewal shows "Log in" without an error message or a crash
- [ ] The backend never logs or sends back anything but the renewed login
- [ ] Works on the live URL
