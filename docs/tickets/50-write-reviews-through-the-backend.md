# 50 — Write, edit and delete reviews through the backend

**What to build:** The NestJS backend gets endpoints to add a review, edit one's own review and delete one's own review. The browser sends the traveler's login with each request, and the backend passes it on to Supabase, so Row Level Security still decides who may change what. The review form and the Edit and Delete buttons use these endpoints.

**Blocked by:** 49

**Status:** in progress (adding, editing and deleting all go through the backend with TypeORM on localhost, 2026-10-27; editing and deleting need a real test, then the live URL)

- [x] A logged-in traveler can add a review, and it appears straight away, as before
- [x] They can edit and delete their own review, as before
- [ ] A second review for the same place, or a request without a login, is refused with the same plain messages as before
- [x] Trying to edit or delete someone else's review through the backend is refused by the database (Row Level Security), not just hidden in the page
- [x] The backend accepts adding, editing and deleting only from the site's own addresses (CORS)
- [ ] Works on the live URL

**Progress (2026-10-25):** adding a review now goes through the backend. The NestJS endpoint POST /v1/reviews takes the traveler's login token from the Authorization header and adds the review through Supabase as that traveler, so Row Level Security still applies; the browser no longer sends new reviews to Supabase's data API. CORS allows GET and POST (with the Authorization header). Checked on localhost without a real login: no login gives 401 "Please log in to write a review.", stars outside 1-5 give 400, a fake login gives 401 "Please log in again". The team then added a review while logged in on localhost: the Network tab showed a POST to localhost:5000/v1/reviews and the review appeared straight away. Still to do: edit (PATCH) and delete (DELETE) through the backend.

**Change (2026-10-25, team request):** the backend no longer saves new reviews through Supabase's data API. POST /v1/reviews now checks the login token with Supabase Auth, then inserts the review itself through its own database login (`lakat_api`, TypeORM), acting as the traveler inside one transaction so Row Level Security and the trigger still apply. This needs `supabase/sql/023` to be run once in the Supabase SQL Editor. Checked on localhost: no login and a fake login are still refused (401) and reading still works. Still to do: run 023, then add a review while logged in again.

**Change (2026-10-25, team request):** POST /v1/reviews now writes with TypeORM instead of Supabase's data API. The backend checks the traveler's login token with Supabase Auth, then, in one transaction, names that traveler and switches to Supabase's "authenticated" role, so Row Level Security still checks the insert. supabase/sql/023 (run by the team) lets lakat_api make that switch; lakat_api is NOINHERIT, so it has those rights only during the switch. Checked on localhost with the backend's own login, both inserts rolled back: without the switch, "permission denied for table reviews"; switched but with no traveler named, "new row violates row-level security policy". The earlier real test of adding a review used the data-API version, so adding a review needed testing again with this version: on 2026-10-26 the team added a review while logged in on localhost with the TypeORM version, and it saved and appeared straight away.

**Progress (2026-10-27):** editing (PATCH /v1/reviews/:id) and deleting (DELETE /v1/reviews/:id) now go through the backend with TypeORM too, sharing the same "act as the logged-in traveler" step as adding. The website no longer talks to Supabase's data API for reviews at all. CORS allows GET, POST, PATCH and DELETE, only from CORS_ORIGIN. Checked on localhost: without a login, or with a fake one, editing and deleting are refused (401); a malformed id is refused (400); the browser permission check allows PATCH and DELETE from localhost:3000. Checked in the database with the backend's own login, every change rolled back: a made-up traveler editing or deleting Miag-ao Church's review changed 0 rows (Row Level Security hides it), while the review's own author editing it changed 1 row.

**Checked by the team (2026-10-27):** after a hard refresh on localhost, editing and deleting their own review worked, and the Network tab showed PATCH and DELETE to localhost:5000/v1/reviews (an older open tab had still been running the earlier code).

