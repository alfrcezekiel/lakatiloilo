# 69 — Star ratings on home cards

**What to build:** Every place card on the home page, including Featured and Trending, shows its rating under the name, for example "★ 4.3 · 12 reviews", or "No reviews yet". The backend gets a new read-only endpoint, GET /v1/ratings, that works out each place's average stars and number of reviews from the reviews table. The Next.js server fetches it together with the places, so the home page arrives with ratings already in it.

**Blocked by:** 68

**Status:** todo

- [x] GET /v1/ratings answers each reviewed place's average stars and number of reviews, for anyone, with no login
- [x] Every home card, including Featured and Trending, shows "★ 4.3 · 12 reviews" or "No reviews yet"
- [x] A card's rating matches the Rating tile on that place's detail page
- [x] Writing a review, then going back home, shows the new rating on that card
- [x] If the ratings cannot be loaded, the cards still show (without ratings) and nothing breaks
- [x] No database tables, columns or policies change
- [ ] Works on the live URL

**Progress (2026-11-01):** The backend has a new read-only endpoint, GET /v1/ratings (anyone, no login), next to the reviews endpoints. It works out each reviewed place's average stars and number of reviews from the reviews table with TypeORM, through the same database login that already reads reviews. No SQL, tables, columns or policies changed. The Next.js server asks for the ratings together with the places, so the home page arrives with them. Every home card, Featured and Trending included, shows "★ 4.5 · 2 reviews" ("1 review" for one) or "No reviews yet" under the name; screen readers hear "Rated 4.5 out of 5 from 2 reviews". The number is rounded like the detail page's Rating tile. If the ratings cannot be loaded, the cards show without a rating line and the page does not say places failed. The skeletons gained a grey rating line, so nothing jumps.

Found while checking: pressing the browser's Back button after opening a place showed the home page Next.js had kept from earlier, so a card would keep its old rating after a review was written. Writing, editing or deleting a review now also tells Next.js to forget those kept pages (router.refresh), so going back asks the server again. The page's own "Back to Home" button always asked the server again.

Checked on localhost: `curl http://localhost:5000/v1/ratings` answered 200 with each reviewed place's average and count (no input, so no refusals to test). On the home page all 34 cards showed the rating the endpoint gives (31 with stars, 3 with "No reviews yet"), and the browser made no ratings or places request of its own. Seda Atria's card said 4.5 · 2 reviews, the same as its detail page's Rating tile. Back button: without a review change, going back fetched nothing new; after the same refresh the review code now runs, going back fetched the home page from the server again. Backend type-check, website type-check, lint and `npm run build` pass. Not checked: writing a real review and seeing the card change (the team tests real logins; a pretend login could not be kept through the page change), the "ratings could not be loaded" case, the skeletons on screen, a real phone, and the live URL (not pushed yet; the backend deploys on the same push).

**Ticked by the team (2026-11-01):** the team ticked the boxes after testing on localhost. "Works on the live URL" stays open until ticket 69 is pushed and checked there.
