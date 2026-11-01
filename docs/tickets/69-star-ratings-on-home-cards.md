# 69 — Star ratings on home cards

**What to build:** Every place card on the home page, including Featured and Trending, shows its rating under the name, for example "★ 4.3 · 12 reviews", or "No reviews yet". The backend gets a new read-only endpoint, GET /v1/ratings, that works out each place's average stars and number of reviews from the reviews table. The Next.js server fetches it together with the places, so the home page arrives with ratings already in it.

**Blocked by:** 68

**Status:** todo

- [ ] GET /v1/ratings answers each reviewed place's average stars and number of reviews, for anyone, with no login
- [ ] Every home card, including Featured and Trending, shows "★ 4.3 · 12 reviews" or "No reviews yet"
- [ ] A card's rating matches the Rating tile on that place's detail page
- [ ] Writing a review, then going back home, shows the new rating on that card
- [ ] If the ratings cannot be loaded, the cards still show (without ratings) and nothing breaks
- [ ] No database tables, columns or policies change
- [ ] Works on the live URL
