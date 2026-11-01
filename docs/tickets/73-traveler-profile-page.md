# 73 — Traveler profile page

**What to build:** Clicking a reviewer's name in any review opens their profile page, which anyone can see. It shows the display name in large serif letters, the traveler type tag, how many reviews they have written, and their reviews, newest first. Each review shows the place's name (linking to that place), stars, text, date and Helpful count. Email is never shown. The backend gets GET /v1/travelers/:id, built from the reviews table. An unknown traveler, or one with no reviews, shows "We couldn't find this traveler" with a Back to Home button.

**Blocked by:** 72

**Status:** done (confirmed by the team on the live URL, 2026-11-01)

- [x] GET /v1/travelers/:id answers the traveler's name, traveler type, review count and reviews with place names and Helpful counts, for anyone; 404 "We couldn't find this traveler." for an unknown id or a traveler with no reviews; it never answers an email
- [x] Every reviewer's name in the Reviews section links to their profile
- [x] The profile page shows the name, traveler type tag, review count and every review, newest first
- [x] Each place name on the profile opens that place's detail page
- [x] An unknown traveler shows "We couldn't find this traveler" and a Back to Home button, not a crash
- [x] Looks tidy on a phone (375 px) and a laptop, in the site's glass style
- [x] Works on the live URL

**Progress (2026-11-01):** The backend has a new read-only endpoint, GET /v1/travelers/:id (anyone, no login), in its own travelers module. It builds the profile from the reviews table: a traveler's account lives in Supabase Auth, which the backend could only read for someone else with the service_role key, and reviews already carry user_id, reviewer_name and traveler_type. So the name and type come from the traveler's newest review, and a traveler with no reviews has no public profile. Each review comes with its place's name (from destinations or accommodations) and its Helpful count. Read through the backend's own database login, which can already read all four tables; no new SQL. An unknown traveler, one with no reviews, and an id that is not a valid id all answer 404 "We couldn't find this traveler."

Website: a new page at /travelers/<id>, fetched on the Next.js server like the detail pages, on the teal background. It shows a small "TRAVELER PROFILE" label, the name in large serif letters, the traveler type tag and "15 reviews", then each review in a glass card: the place's name with a pin icon (linking to the place), the date, stars, text, and "3 travelers found this helpful" when it has likes. The browser tab title is "<name> · Lakat Iloilo". In every Reviews section the reviewer's name is now a link to their profile (underlined on hover, with a keyboard outline).

Checked on localhost:
- curl: Red's profile answered their name, type, 15 reviews with place names and Helpful counts, and no email anywhere; an unknown id and "hello" both answered 404 "We couldn't find this traveler."
- Browser: clicking "Red" in Seda Atria's reviews opened /travelers/<id> with "Red", "Visitor from PH", "15 reviews" and 15 reviews, each with a place link and no email. Clicking "Balog Falls" opened Balog Falls; the browser's Back button returned to the profile. An unknown traveler and /travelers/hello showed "We couldn't find this traveler" with a Back to Home button. At 375 px nothing reaches past the screen edge and a long word in a review wraps.
- Backend type-check, website type-check, lint and `npm run build` pass.

Not checked: a real phone, and the live URL (not pushed yet).

**Ticked by the team (2026-11-01):** the team ticked the boxes after testing on localhost. "Works on the live URL" stays open until ticket 73 is pushed and checked there.

**Confirmed by the team (2026-11-01):** checked on the live URL and marked done.
