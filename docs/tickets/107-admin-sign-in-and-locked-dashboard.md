# 107 — Admin sign-in and a locked dashboard

**What to build:** The Lakat Iloilo team gets its own door. A team member whose account is in the new admins table signs in at the admin sign-in page — a glass card over a darkened Iloilo photo ("Lakat Iloilo · Team", email, password, Sign in) — and lands on the dashboard: an empty shell with a glass sidebar (Overview, Reports, Places, Back to the site, Log out; on phones a top bar with a menu). A traveler account is refused at the sign-in with "This sign-in is for the Lakat Iloilo team." and is not logged in. Anyone who is not an admin, logged in or not, sees the site's "not found" page on every admin page except the sign-in. The team adds the first admin (the team's manager) by hand in the Supabase SQL Editor; the app can never make anyone an admin.

**Blocked by:** None

**Status:** done

- [x] A numbered SQL file adds the admins table with Row Level Security on and its policies (a person may read only their own row; nobody may write through the app); the team has run it and added the manager's account by hand
- [x] The manager signs in at the admin sign-in page and sees the dashboard shell with its sidebar
- [x] A traveler account is refused at the admin sign-in with "This sign-in is for the Lakat Iloilo team." and stays logged out
- [x] Logged out or as a traveler, the dashboard shows "not found", and the admin endpoints answer 403 (checked with curl)
- [x] The sign-in and the shell work with the keyboard alone, pass WCAG AA contrast, and work at 375 px and on a laptop
- [x] Works on the live URL

**Progress (2026-11-08):** restarted from scratch (the first attempt was rewound by the team; its unfinished code was removed and backed up outside the project). Step 1 written: supabase/sql/038-admins.sql adds the admins table (Row Level Security on; a person may read only their own row; no write permissions at all) and redefines is_admin(), which a rewound attempt had left in the database without a file. Adding the manager is a separate two-line query the team runs with the manager's email typed in, so the email is never saved in the project. Waiting for the team to run 038 and add the manager before the backend and screens are built.

**Progress (2026-11-08):** the team ran 038 and added the manager by id (the email search matched two accounts, so adding by id was the safe way). Proved through the backend's login inside a rolled-back transaction: a traveler is not an admin, reads 0 rows of admins and is refused when adding themselves; the backend's own login cannot read the table. Built:
- Backend: a shared admin check asks the database's is_admin() as the person (never trusts the browser); GET /v1/auth/me also answers is_admin; POST /v1/admin/login logs in like a traveler, then logs a non-admin out at once and answers 403 "This sign-in is for the Lakat Iloilo team."; GET /v1/admin/me answers only admins.
- Website: /admin/login (glass card over the darkened Iloilo photo, "Team only"); /admin (the locked shell: a glass sidebar on laptops, a top bar with a menu on phones, a skip link, Overview with a welcome panel, Reports and Places marked "Soon", Back to the site, Log out). Anyone who is not an admin sees the site's "not found" page; all admin pages are hidden from search engines and use the site's plain title.

Checked: website type-check, lint and `npm run build`; backend type-check and lint. In the browser (logged out): /admin shows "We couldn't find that page" with no sidebar and robots "noindex"; /admin/login shows the glass sign-in, and an empty form says "Please enter your email and password." Not checked: the new endpoints, because the team's backend watcher stopped rebuilding v1.module.ts (its built copy is from 10:15) and needs a restart; the manager signing in; a traveler being refused; 375 px; the live URL.

**Team check (2026-11-08):** the earlier insert had not saved (the admins table was empty), so the team added the manager with a single query that only adds when exactly one account matches; the check query shows one admin. The team's backend watcher was restarted (10:38) and serves the admin endpoints. Proved through the backend's login inside a rolled-back transaction: 1 of the 13 known accounts is an admin; the admin reads only their own row; a traveler is not an admin, reads 0 rows and cannot add themselves; the admin cannot add another admin or remove their own row through the app; the backend's own login cannot read the table. curl: GET /v1/admin/me answers 401 without a login and with a fake one; POST /v1/admin/login with a wrong password answers 400 "invalid_credentials" (the page shows "Wrong email or password."). Not checked yet: the manager signing in, a traveler being refused, 375 px and the keyboard, and the live URL.

**Change (2026-11-08, team request): full width.** The dashboard now fills the whole browser: the sidebar on the left and the page across the rest (it was capped at a fixed width and centred). Checked in the browser on localhost, signed in as the admin, at 1920 px: the sidebar starts 24 px from the left, the page ends 24 px from the right (1592 px wide), no sideways scrolling. `npm run build` passes.

**Change (2026-11-08, team request): a real 404 for non-admins (Next.js proxy).** Root cause of the 200: the website keeps logins in the browser's storage, which the server cannot see, so the server always served /admin (200) and only the page's JavaScript then showed "not found". Now:
- The admin sign-in also keeps the admin's login in a cookie (lakat-admin-login) sent only to /admin pages (Path=/admin, SameSite=Strict, Secure on the live site). A renewed login replaces it, logging out removes it, and travelers never get one. An already signed-in admin who opens /admin/login gets a fresh one.
- A Next.js proxy (src/proxy.ts; "middleware" before Next.js 16) runs before every /admin page except the sign-in. It asks the backend GET /v1/admin/me with that cookie; only an admin's login passes. No cookie, a traveler's login, an expired one or no answer from the backend: the site's not-found page with status 404.
- The page's own check and the backend's 403s stay, so nothing relies on the proxy alone.

Checked: type-check, lint and `npm run build` (the build lists "Proxy (Middleware)"); curl on localhost: /admin 404 with the "We couldn't find that page" text, /admin/anything 404, /admin with a fake cookie 404, /admin/login 200, / 200. In the browser, signed in as the admin: /admin/login set the cookie and opened the dashboard, and /admin answered 200. Not checked: logging out removing the cookie, a traveler account at /admin (404), and the live URL (the live backend address must be set in Vercel as NEXT_PUBLIC_API_URL, which it already is for the site).

**Change (2026-11-08, team request): a NestJS middleware for the admin endpoints.** AdminOnlyMiddleware runs before every admin endpoint except POST /v1/admin/login (applied to the admin controller in AdminModule), so later admin endpoints are protected without each one remembering to check: 401 without a valid login, 403 "This page is for the Lakat Iloilo team." for non-admins, decided by the database's is_admin(). The website has no admin endpoints of its own (no API routes); its admin pages are protected by the proxy above. .claude/rules/backend.md now says a new admin controller must be added to the middleware. docs/SPEC.md updated.

Checked: backend type-check and lint; curl: GET /v1/admin/me 401 without a login and 401 with a fake one (now the middleware's own message, so it runs first), POST /v1/admin/login not blocked (a wrong password answers "invalid_credentials"), the CORS preflight still 204, GET /v1/destinations still 200. In the browser, signed in as the admin, /admin answered 200 with the dashboard (the proxy's check passes through the middleware). Not checked: a traveler's login at an admin endpoint (403), and the live URL.

**Team check (2026-11-08, localhost):** the team confirmed every localhost box: the manager signs in and sees the full-width dashboard; a traveler is refused at the admin sign-in and stays logged out; logged out or as a traveler, /admin answers 404; the admin endpoints refuse non-admins; keyboard, contrast, 375 px and laptop all work. Still open: the live URL, after "commit and push".

**Fix (2026-11-09, code review):** an admin could get "not found" at /admin while still signed in, after about an hour on the main site or on coming back the next day. Cause: the cookie lasts as long as the login token (about an hour), and renewing the login only renewed the cookie when the page could see it. A page only sees the cookies for its own path, so on the main site it never could. Fix:
- the browser now remembers "this login is an admin's" next to the login (lakat-admin in localStorage), so a renewal on any page renews the cookie
- on the "not found" page under /admin, a signed-in browser renews the login, asks the backend (GET /v1/auth/me) whether it is an admin, and for an admin sets the cookie again and reloads once (at most one try per address every 30 seconds); travelers still get "not found"

**Fix (2026-11-09, team report: slow /admin/login and dashboard navigation, two loading screens):**
- **Measured:** each Supabase Auth login check took 170–820 ms and each admin-check transaction about 480 ms (5 database round trips of ~96 ms). One click between dashboard pages repeated them about 7 times, roughly 3 s:
  - the proxy's GET /v1/admin/me: the middleware checked the login and admin, then the endpoint checked both again
  - Next.js preloading each sidebar link, which ran that same proxy check
  - the page's data request: the middleware, then the service, checked again
- **Backend:**
  - a genuine login check is remembered for 30 seconds (never past the token's expiry), under a fingerprint of the token, and forgotten at log-out and after a details change
  - "is an admin" is remembered for 30 seconds
  - the transaction sets who is asking and the role in one round trip (`set_config('role', 'authenticated', true)`, the same as "set local role"); proved in the database: the role is authenticated, a traveler still reads 0 reports, the backend's own role is back after commit, and the admin check took 374 ms instead of ~480
  - Row Level Security still checks every read and change
- **Proxy:**
  - only full page loads (the request whose status is 404) are checked; in-app navigation and Next.js preloading fetch only the page's code (no data)
  - an accepted admin login is remembered for 30 seconds
  - curl: /admin, /admin/reports and a fake cookie still answer 404, and /admin/login answers 200
- **Loading:**
  - while access is checked, the shell draws the dashboard layout (sidebar, title) with the page's own skeleton, the same one the page shows while its data loads, so the screen goes skeleton → content in one step
  - each page starts its data request at once, next to the "who is logged in" check
  - the sign-in button stays busy ("Opening the dashboard…") until the dashboard opens, and the dashboard is preloaded on the sign-in page
- **Logging out (team request 2026-11-09):** no skeleton any more. The dashboard stays on screen as it was, the button shows a spinner and "Logging out…", and the sign-in page opens; it never flashes "not found" in between.
- **Code review of 1748539 (2026-11-09), fixed:**
  - the proxy's in-app shortcut now needs the admin cookie (before, adding the `rsc` header with curl got the page code with 200; now 404, checked with curl for a full page load, an in-app request and a preload)
  - the remembered admin answer never outlives the token
  - the login and admin memories share one helper, backend/src/v1/token-memory.ts
  - the spec states the trade-off: each running copy of the backend keeps its own memory, so a logged-out login may still be accepted by another copy for at most 30 seconds

**Team check (2026-11-10, live URL):** the team confirmed it works on the live URL; all boxes ticked, ticket done.
