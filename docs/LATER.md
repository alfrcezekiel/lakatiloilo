# Later

Good ideas that are not in the MVP.

Parking something here is a decision, not a loss. It is how the MVP
stays small enough to actually ship by Session 3.

## Future features

### Polish round leftovers
The polish round (2026-11-01) brought Lucide icons, Motion animations and
TanStack Query for reviews. On 2026-11-01 "who is logged in" through
TanStack Query and page transitions moved into the spec as the
navigation round. Still parked:
- Login renewal through TanStack Query. Renewal is a timer with a
  one-tab-at-a-time lock and retries, not data fetching, which is what
  TanStack Query is for; the current code works and passed the live
  checks, so rewriting it only adds risk
- The old page animating out when moving between pages (the App Router
  cannot keep it on screen without an experimental setting), and that
  experimental "view transitions" setting itself
- Fetching places in the browser (they stay on the Next.js server, so
  the home page arrives already filled in)

### User accounts and reviews
Accounts and reviews/ratings on detail pages moved into the spec on
2026-10-21 (reviews and ratings round). On 2026-11-01 star ratings on the
home page cards moved into the spec as the buttons & cards round. On
2026-11-01 the team moved the planned rounds into the spec together:
the profiles & likes round (with Back to Home that follows you down),
then the review extras round (replies, reports, photos). They stay two
rounds, each about one session, built and checked live one after the
other.

On 2026-11-05 the team moved the rest of this list into the spec as
three rounds, built one after the other: the profile & replies round
(changing the display name and traveler type, editing replies, likes on
replies, a real 404 for an unknown traveler's profile), the thread care
round ("This reply was deleted", folding long threads, a notifications
bell) and the moderation & photos round (auto-hiding reported reviews, a
Reports screen for admins, up to four photos per review).

Still parked:
- Social logins

### Email confirmation for new accounts
Turned off for the demo on 2026-10-21 (ticket 38). Before real launch:
turn "Confirm email" back on in Supabase, set up a custom email sender
(the built-in one allows only a few emails per hour), and add a page
that handles the confirmation link. On 2026-11-01 the team kept this
parked: a custom email sender needs an outside email service (for
example Resend or Brevo), which is outside the pinned stack, so everyone
has to agree to add it first.

### From the buttons & cards round (2026-11-01)
- A "Get directions in Google Maps" button on destination pages

### Extras from the login design (option 1a)
The login page uses the look of option 1a from the "Lakat Auth" design
(2026-10-21). On 2026-10-23 the password strength bar, "I'm traveling
as", "Keep me logged in" and Forgot password moved into the spec as the
login extras round (tickets 43–47). Still parked:
- "Continue with Google" and "Continue with Facebook" (social logins)
- "By creating an account you agree to the Terms and Privacy Policy"
  (needs those pages first)
- Language switch: English / Hiligaynon / Filipino
- A custom email sender, so reset emails are not limited to a few an hour

### From the user test (Elizabeth and Mark, 2026-10-25)
Ideas from question 4, "What one thing would make this more useful?"
(see docs/USER-TEST.md). Each needs the team to decide what it means
before it becomes a ticket:
- More detailed information about each destination and accommodation
- More interactive features (the interactive map below is one candidate)

### From the likes on TypeORM round (2026-11-02)
- Split the reviews service. It is now about 370 lines (the review
  extras round added the photo steps to writing, editing and deleting
  reviews), doing reading reviews, ratings, writing reviews, likes, photos
  and turning database errors into messages. Plan: move liking and
  unliking into their own likes service, and the photo steps of writing,
  editing and deleting into the review photos service. (The "act as the
  traveler" step already moved into a shared helper in ticket 79.) No
  change for travelers; about one ticket.
- Move adding, editing and deleting reviews onto TypeORM too (kept out of
  the likes round on purpose).

### From the review extras round code review (2026-11-02)
- One Supabase login check per review with a photo instead of two: the
  photo upload and the save each ask Supabase who the traveler is; the
  upload could pass the traveler id on to the save.
- Keep reports when a review is deleted (needs a team decision and a SQL
  change). Today deleting a review also deletes its reports, as the spec
  says, so the writer of a reported review can make the report disappear
  by deleting it. One option: keep the report with a copy of the review's
  text instead of deleting it.
- Tidy up photos left behind in Storage. If deleting an old photo fails
  (Storage briefly unavailable), the file stays and is only logged; a
  check could list files that no review points to. Fine for the demo:
  they can be deleted by hand in the Storage dashboard.

### From the evaluations (2026-11-04 and 2026-11-05)
Parked by the team; none is needed for the demo. Details in
`docs/evaluations/`.
- A Content-Security-Policy header (a list of where pages may load
  scripts, images and connections from). The simple security headers are
  in; a CSP needs careful testing because it could block Supabase live
  updates, review photos or Next.js's own scripts.
- B8: the Log in / Create account switch and the submit button are both
  called "Log in". Screen readers already tell them apart ("toggle
  button, pressed" inside the "Log in or create an account" group);
  proper tabs (`role="tablist"`) would need arrow-key handling.

### From the live updates round (2026-11-02)
- See new reports as they arrive. The Reports screen and admins come in
  the moderation & photos round (2026-11-05); making it live is still
  parked.
- Live traveler profile pages, and "new review" pop-ups or sounds.

### From the live updates round code review (2026-11-02)
- Fewer review refetches. Today an open place page fetches its reviews
  again whenever any review on the whole site changes. Harmless with a
  few travelers, but with many online every review sends a burst of
  requests to the backend. Fix: for new and edited reviews, listen only
  to this place (filter by `place_id`); deleted reviews, likes and
  replies cannot be filtered that way and stay as they are.

### From the threaded replies round code review (2026-11-02)
Parked by the team; none is needed for the demo.
- A limit on how deep a thread can go (for example 50 levels) or how many
  replies a review can have, and a per-traveler rate limit. Today someone
  with a script could post thousands of replies, each answering the last,
  which would make the page slow and could crash it.
- The right message in a rare timing case: if a reply is deleted at the
  exact moment someone answers it, they see "We couldn't find that
  review." instead of "That reply isn't under this review."
- A project-specific database error code for "that reply isn't under this
  review" in a new SQL file, instead of the general code 22023.
- One way to check ids in the replies controller (parent_reply_id has its
  own pattern; ids in the web address use NestJS's check).
- Split the replies component (about 400 lines): the reply form and one
  reply into their own files. No change for travelers.
- Keyboard focus: after Cancel or Delete, send focus back to the reply's
  Reply link instead of the top of the page; move focus to "Yes, delete"
  when the confirm step opens.
- Answers whose parent reply is gone are silently not shown (only
  possible for a moment during a race); fine as it is, noted here.

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

### From the thread care round code review (2026-11-07)
Notifications bell, lighter live updates. The bell asks the
backend for the traveler's notifications again whenever anyone, anywhere
on the site, adds or removes a reply or a Helpful mark (ticket 104,
fix 2). Each logged-in visitor makes one small request per such change:
fine at workshop size. If the site grows, listen to the notifications
table itself with the traveler's login (Supabase did not register that
connection when we tried it; see ticket 104), or narrow the doorbell to
the traveler's own reviews and replies. The same would make "marked read
on another device" show at once instead of on returning to the tab.

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
