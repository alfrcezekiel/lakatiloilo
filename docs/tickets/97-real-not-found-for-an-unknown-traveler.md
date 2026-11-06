# 97 — Real "not found" for an unknown traveler

**What to build:** Opening the profile of an unknown traveler (or one with no reviews) looks the same as today — "We couldn't find this traveler" and Back to Home — but the page now answers with a real 404 ("not found") status, so search engines and checking tools know it does not exist. Travelers see no change.

Tried before on 2026-11-01 (ticket 75): Next.js's notFound() showed its own default page instead of ours. Untried idea from docs/LATER.md: a pass-through layout in the travelers folder.

**Blocked by:** None

**Status:** todo

- [x] An unknown traveler's profile answers 404 (checked with curl)
- [x] The page still shows our own "We couldn't find this traveler" design with Back to Home, not Next.js's default page
- [x] A real traveler's profile still answers 200 and looks the same
- [ ] Works on the live URL

**Progress (2026-11-05):** the profile page now calls Next.js's notFound() when the backend answers 404 for the traveler, and a not-found.tsx next to the page shows TravelerNotFoundOrMine (Back to Home and "We couldn't find this traveler", or the logged-in traveler's own empty profile if the id is theirs), with the tab title "Traveler · Lakat Iloilo". When the backend cannot be reached, the page still shows the same screen with status 200, because the traveler may exist. Since ticket 75 the site has a root not-found.tsx (evaluation B4); with it in place, notFound() no longer falls back to Next.js's own default screen.

Checked with curl against a production build (`npm run build`, then `next start` on port 3100, beside the team's dev server):
- /travelers/hello and an unknown id answer 404 with the title "Traveler · Lakat Iloilo"; a real traveler answers 200 with their name; /nope still answers 404 with "Page not found".
- The page's data names TravelerNotFoundOrMine (the travelers/[id]/not-found.tsx boundary), and "This page could not be found" (Next.js's default) appears nowhere.
- But the server HTML of the 404 has an empty body: Next.js leaves this not-found screen for the browser to draw, unlike /nope. The same happened with the plain TravelerNotFound screen and with a pass-through layout.tsx in the folder (the idea from docs/LATER.md); after the same result twice, the experiments were removed and the code put back.
- Website type-check, lint and `npm run build` pass.

**Team check (2026-11-06):** the team opened http://localhost:3100/travelers/hello in the browser: the grey loading placeholder showed briefly, then our own "We couldn't find this traveler" screen. Next.js's default page did not appear. So drawing this screen in the browser is fine, and nothing needs parking.

The team then opened their own profile, logged in: it showed their name and reviews as before, Edit profile changed the display name and "I'm traveling as", and Cancel went back to the existing name. Together with the curl check (a real traveler answers 200), that confirms real profiles are unchanged.

The team also logged in with a new account with no reviews on localhost:3000 and opened My profile: it showed their own profile with "You haven't written any reviews yet.", and the browser's Network tab showed the page answering 404 Not Found, as intended (no such public profile yet, but the browser recognises the owner).

Not checked yet: the live URL.
