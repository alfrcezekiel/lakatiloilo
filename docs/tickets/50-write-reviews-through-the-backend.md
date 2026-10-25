# 50 — Write, edit and delete reviews through the backend

**What to build:** The NestJS backend gets endpoints to add a review, edit one's own review and delete one's own review. The browser sends the traveler's login with each request, and the backend passes it on to Supabase, so Row Level Security still decides who may change what. The review form and the Edit and Delete buttons use these endpoints.

**Blocked by:** 49

**Status:** todo

- [ ] A logged-in traveler can add a review, and it appears straight away, as before
- [ ] They can edit and delete their own review, as before
- [ ] A second review for the same place, or a request without a login, is refused with the same plain messages as before
- [ ] Trying to edit or delete someone else's review through the backend is refused by the database (Row Level Security), not just hidden in the page
- [ ] The backend accepts adding, editing and deleting only from the site's own addresses (CORS)
- [ ] Works on the live URL
