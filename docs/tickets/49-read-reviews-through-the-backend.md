# 49 — Read reviews through the backend

**What to build:** The NestJS backend gets an endpoint that lists a place's reviews, newest first, for anyone. The reviews section on every destination and accommodation page reads its reviews and average rating from that endpoint instead of straight from Supabase. Travelers see no difference.

**Blocked by:** None

**Status:** done (tested on the live URL by the team, 2026-10-27)

- [x] The backend has the Supabase URL and the publishable (anon) key as settings, locally and in Vercel. It never uses the `service_role` key or any `sb_secret_` key
- [x] Asking the backend for a place's reviews returns them newest first, with the reviewer's display name and traveler type, and never an email address
- [x] The reviews section shows the same reviews, average and "No reviews yet" as before, and the Network tab shows the request going to the backend
- [x] If the backend cannot be reached, the reviews section shows "We couldn't load reviews right now", not a crash
- [x] The backend is redeployed and the endpoint works on its live address
- [x] Works on the live URL

**Checked on localhost (2026-10-25):** the backend has the Supabase URL and publishable key in its local settings (the key's role checked: publishable, not secret). GET /v1/reviews for Miag-ao Church returned its review newest first, with display name and traveler type and no email; a wrong place type and a malformed id are refused (400). Miag-ao Church's page showed the same reviews and average, read from the backend, with no reads straight from Supabase. The team added SUPABASE_URL and SUPABASE_ANON_KEY to the backend's Vercel project on 2026-10-25. Still to do: redeploy, and check "We couldn't load reviews right now" (stopping the backend also stops the detail page itself, so this needs the reviews endpoint alone to fail).

**Change (2026-10-25, team request):** the backend now reads reviews with TypeORM through its own database login (lakat_api), not through Supabase's data API. supabase/sql/023 lets lakat_api read reviews ("api can read reviews" policy); the team ran it. Checked on localhost: Miag-ao Church's reviews come back newest first, with the same fields and no email. This needs a backend redeploy before it works on the live URL.

**Checked on localhost (2026-10-27):** with only the reviews request blocked in the browser and the rest of the page working, the reviews section showed "We couldn't load reviews right now." and nothing crashed.