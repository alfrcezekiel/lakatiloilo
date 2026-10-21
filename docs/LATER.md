# Later

Good ideas that are not in the MVP.

Parking something here is a decision, not a loss. It is how the MVP
stays small enough to actually ship by Session 3.

## Future features

### User accounts and reviews
Accounts and reviews/ratings on detail pages moved into the spec on
2026-10-21 (reviews and ratings round). Still parked:
- Star ratings on the home page cards
- Social logins, profile pages, photos in reviews, replies, likes, reporting reviews

### Email confirmation for new accounts
Turned off for the demo on 2026-10-21 (ticket 38). Before real launch:
turn "Confirm email" back on in Supabase, set up a custom email sender
(the built-in one allows only a few emails per hour), and add a page
that handles the confirmation link.

### Extras from the login design (option 1a)
The login page uses the look of option 1a from the "Lakat Auth" design
(2026-10-21). These parts of that design were parked:
- "Continue with Google" and "Continue with Facebook" (social logins)
- Forgot password (needs a reset page and working emails)
- "Keep me logged in" (Supabase always keeps people logged in today)
- "I'm traveling as: Local Ilonggo / Visitor from PH / Foreign tourist"
- "By creating an account you agree to the Terms and Privacy Policy"
  (needs those pages first)
- Language switch: English / Hiligaynon / Filipino
- Password strength bar

### Interactive map (Mapbox GL) — needs a team decision
Proposed 2026-10-21. Mapbox GL is outside the pinned stack: it adds a new
library, needs a Mapbox account and access token, and is billed past a
free monthly limit. The team parked it until everyone agrees to add it.
If agreed, it should be its own round (about one session): a map of
destinations and accommodations from their coordinates, with pins that
open the detail page.

### Advanced filter search
Proposed 2026-10-21. Filters beyond today's chips and City/Province
toggle, for example "rating 4★ and up" or sorting by rating. Needs the
reviews round to be done first.

### Additional destination categories
- Cultural sites and museums

### Other features
- Booking/payments for accommodations
- Directions on the map (after the map itself)
- Full search results page and searching inside descriptions
- Admin UI for managing destinations and accommodations
- Price range display for accommodations
- Room type information for accommodations
- Business hours for destinations