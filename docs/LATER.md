# Later

Good ideas that are not in the MVP.

Parking something here is a decision, not a loss. It is how the MVP
stays small enough to actually ship by Session 3.

## Future features

### Polish round leftovers
The polish round (2026-11-01) brings Lucide icons, Motion animations and
TanStack Query for reviews. Still parked:
- "Who is logged in" and login renewal through TanStack Query (the
  current login code works and passed the live checks; rewriting it is
  risky)
- Animated transitions between pages
- Fetching places in the browser (they stay on the Next.js server, so
  the home page arrives already filled in)

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
(2026-10-21). On 2026-10-23 the password strength bar, "I'm traveling
as", "Keep me logged in" and Forgot password moved into the spec as the
login extras round (tickets 43–47). Still parked:
- "Continue with Google" and "Continue with Facebook" (social logins)
- "By creating an account you agree to the Terms and Privacy Policy"
  (needs those pages first)
- Language switch: English / Hiligaynon / Filipino
- Changing the traveler type after sign-up (needs a profile page)
- A custom email sender, so reset emails are not limited to a few an hour

### From the user test (Elizabeth and Mark, 2026-10-25)
Ideas from question 4, "What one thing would make this more useful?"
(see docs/USER-TEST.md). Each needs the team to decide what it means
before it becomes a ticket:
- More detailed information about each destination and accommodation
- More interactive features (the interactive map below is one candidate)

### Backend extras (parked from the backend round, 2026-10-25)
The backend round moved the home page, reviews, sign-up and log-in onto
the NestJS backend. Still parked:
- Password reset through the backend. Log-out, "who is logged in" and
  keeping the login fresh moved into the spec as the own login round
  (2026-10-28). The plan for the rest: POST /v1/auth/forgot-password and
  POST /v1/auth/reset-password (save the new password from the link's
  one-time code, so the link works in any browser). It needs the "Reset
  password" email template changed and the "token verifications" rate
  limit raised.
- Logging out of every device at once (parked from the own login round,
  2026-10-28). Listing all users is not possible: it needs the
  service_role key.
- "Nearby places" on detail pages, using the backend's /near endpoints
  (they exist but nothing uses them yet).
- Keeping the backend address private. The browser now calls the backend
  for reviews and log-in, so the address has to stay visible; making it
  private would need the Next.js server to pass those requests on.

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
