# 75 — Profiles & likes round: final check

**What to build:** The team walks through the "Profiles & likes round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 71, 72, 73, 74

**Status:** done (confirmed by the team on the live URL, 2026-11-01)

- [x] Every item in the "Profiles & likes round" checklist works on the live URL
- [x] Existing browsing, search, reviews, ratings on cards, sign-up, log-in, log-out and password reset still work
- [x] /code-review has been run on the round and its findings handled
- [x] Works on the live URL

**Progress (2026-11-01):** /code-review ran on the round (from b001b93, the last push: tickets 71–74 and the card band fix, all uncommitted), both axes one after the other.

Spec: everything in screen 20, the review_likes Data section and the four endpoint lines is built, including the team's two navbar changes (profile dropdown, name only). One small difference: a Helpful count of 0 is not shown at all (the spec's example is "3 found this helpful"), and the wording is "3 travelers found this helpful".

Safety and Standards: no must-fix findings. review_likes has Row Level Security on with four explicit policies (proved earlier through the backend's own login, rolled back); no secrets, no `.env`, no raw HTML, every query passes values as $1, $2…; the build passes. Judgement calls left for the team:
1. The profile page asks the backend for the same traveler twice per visit (once for the tab title, once for the page).
2. Review cards and profile cards still use the glass blur while they animate in, the same cause as the card band just fixed on the home page.
3. A logged-in traveler's first visit to a place fetches its reviews twice (logged out, then with the login), and the Helpful button can briefly show unmarked before turning amber.
4. Every logged-in reviews read also asks Supabase Auth who the traveler is (one extra request, counted in Supabase's limits).
5. Small copies: the id check (backend, twice), the glass card style and the "N travelers" wording (website, twice each). reviews.service.ts (318 lines) and api.ts (304) are just past 300 lines but each still does one job.

Not done yet: the team's walk-through of the "Profiles & likes round" checklist on the live URL (tickets 71–74 are not pushed yet).

**Review findings handled (2026-11-01, team request: fix 1–3):**
1. Profile page: the traveler is loaded through React's cache(), so the tab title and the page share one backend request per visit instead of two.
2. Review cards, the review form, the "your review" box, the "review deleted" message, profile cards and the profile's traveler tag no longer use the glass blur, and the cards no longer get the Card block's small default shadow. Same cause as the home page band (ticket 68). The glass card style is now shared by the Reviews section and the profile page instead of copied.
3. A place's reviews now wait for "who is logged in" before loading, so they load once for the right traveler; the Helpful button no longer shows unmarked for a moment. Logged out, nothing waits.

Checked on localhost (one preview tab only; pretend login and pretend answers for "who is logged in" and the logged-in reviews request, nothing sent to Supabase): logged out, Seda Atria made 1 reviews request and its review cards measure no blur and no shadow; logged in, opening Hotel del Rio made exactly 1 reviews request, sent with the login, and its Helpful button was marked from the start; logging out on the page reloaded the reviews as logged out (no Helpful button), and logging back in reloaded them with the login (marked again). Red's profile still opens ("Red · Lakat Iloilo", 15 reviews) with no blur or shadow on its cards. Lint and `npm run build` pass. Not checked: the number of backend requests for the profile page (it happens on the Next.js server; cache() is how Next.js shares one fetch between a page and its tab title), and the live URL.

Left as they are (team's choice): 4 (the extra Supabase Auth check on logged-in reviews reads) and 5 (small copies; two files just past 300 lines).

**Checked by the team on the live URL (2026-11-01):** every item in the "Profiles & likes round" checklist passed on a laptop and a phone, and the existing features (search, reviews, ratings on cards, sign-up, log-in, log-out, password reset) still work. Review findings 1–3 were fixed before the push; 4 and 5 were left as they are.
