# 157 — Security hardening final check

**What to build:** Verify on the live URL that the backend address is not visible in the browser, all existing features work (home, detail pages, reviews, login, admin dashboard), live updates continue to work, and photo uploads and display continue to work.

**Blocked by:** 156

**Status:** todo

- [ ] The backend address is not visible in browser JavaScript (check in DevTools)
- [ ] The backend address is not visible in the browser network tab (all calls are to /api/*)
- [ ] The home page loads and displays places correctly
- [ ] Destination and accommodation detail pages load correctly
- [ ] Reviews load and display correctly
- [ ] Writing, editing, and deleting reviews work
- [ ] Login and signup work
- [ ] The admin dashboard loads and functions correctly
- [ ] Supabase Realtime live updates still work
- [ ] Photo uploads and display still work
- [ ] The Content-Security-Policy header is present and enforced
- [ ] Works on the live URL
