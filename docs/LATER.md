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
- ~~A "Get directions in Google Maps" button on destination pages~~ — done
  2026-11-22 in the glass detail pages round (side panel and map popup)

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
Parked by the team; moved into the security hardening round in the spec
(2026-11-19). Details in `docs/evaluations/`.
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
- Keeping the backend address private. Moved into the security hardening
  round in the spec (2026-11-19).

### Interactive map (Mapbox GL) — agreed for the detail pages
**Change (2026-11-22, team request):** the team agreed to Mapbox GL for
the destination and accommodation pages: the map with Satellite,
Satellite Streets and Streets, live traffic, a live route from the
traveler's location, and a full-screen map on phones (docs/SPEC.md,
detail pages; tickets 159 and 160). Satellite works on the second
account's token (the first account had no satellite allowance). Mapbox
stays outside the pinned stack and is billed past a free monthly limit.

Still parked:
- A map of all destinations and accommodations on the home page, with
  pins that open the detail page (proposed 2026-10-21).
- Nearby-place pins on the map: part of "Nearby places" above (same
  /near endpoints). Its unused first draft was removed from PlaceMap.tsx
  in the code review of 2026-11-22.

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

### From the admin extras spec (2026-11-12)
Parked to keep the round to five features:
- Travelers' own deletes going to the Trash (it is for admin deletes)
- Restoring a single Helpful like, and restoring notifications
- Uploading a new photo just for a category card (it uses a place's
  photo, which already has its credits)
- Reordering place photos by dragging (arrow buttons instead)
- More than 6 photos per place
- A scheduled job that empties the Trash (expired items go when an admin
  opens it)

### From the photo credits spec (2026-11-11)
Round 29 (photo credits and copyright on place photos). Parked to keep it
to one round:
- Moving the 30 hard-coded Wikimedia credits (src/lib/photo-credits.ts)
  into the place_photo_credits table
- Credits for photos in travelers' reviews
- Checking automatically that an original URL or a licence is real
- A "Remove credits" button on the place form: once saved, credits can be
  changed but not cleared (code review 2026-11-11)

### From the full admin management spec (2026-11-10)
Round 28 moved into the spec on 2026-11-10 as the full admin management
round (places add, edit every field and delete, with the photo uploaded
from the computer; a Reviews screen with replies; removing Helpful
likes). Parked to keep it to one round:
- Picking a place's position on a map (the map library, Mapbox GL, is
  now in the app since 2026-11-22; the admin picker itself is still
  parked); the form uses latitude and longitude fields

On 2026-11-10 the team moved three parked items into the round: new
categories and kinds from the dashboard, a live Reviews screen, and Undo
after a delete.

On 2026-11-12 the team moved five more into the spec as the admin extras
round: more than one photo per place, hiding a reply, renaming a category
or kind with its icon and photo, a live Places list, and a Trash after
the 8-second Undo.

### From the admin dashboard spec (2026-11-08)
Parked when the team asked for a full admin dashboard, to keep round 27
to one session:
- Making someone an admin, or removing them, from the app (today: the
  SQL Editor only)
- Managing travelers' accounts, banning travelers, and appeals
- Seeing new reports arrive live on the dashboard
- Charts and history beyond the four stat tiles
- A second login step (a code) for admins

### Additional destination categories
- Cultural sites and museums (from the full admin management round the
  team can add these as categories from the dashboard)

### Other features
- Booking/payments for accommodations
- ~~Directions on the map~~ — done 2026-11-22 as the route preview on the detail pages
- Full search results page and searching inside descriptions
- Price range display for accommodations
- Room type information for accommodations
- Business hours for destinations

### From the reviews & media round (2026-11-22)
Parked to keep the round to one session (docs/SPEC.md, Screens 32):
- Videos on the traveler profile page (only the place pages and the admin
  screens show them this round)
- Captions or subtitles for review videos (needed for deaf and
  hard-of-hearing travelers before videos become a big part of reviews)
- More than one video per review
- Shrinking or converting videos (the team wants them kept exactly as
  uploaded; MOV videos from iPhones may not play in every browser)
- Converting photos saved before this round to WebP (a one-off script)
- ~~Raising the 2 MB photo limit~~ — instead, photos over 2 MB are made
  smaller in the browser before upload (ticket 164 change, 2026-11-22);
  the stored limit stays 2 MB
- Removing a video that was uploaded but never attached to a saved review
  (it stays in the traveler's folder and uses storage)
- Remembering the chosen review sort between visits
- **Storage:** Supabase's free plan holds 1 GB for all photos and videos
  together (about 20 full-size videos). When the Overview turns amber, the
  team decides: a paid plan, smaller video limits, or deleting old videos.
- **Hidden videos can still be opened by their direct address** (found
  during the L4 checks, 2026-11-23). The `review-videos` bucket is public,
  so hiding a review or moving it to the Trash removes its video from the
  app, but anyone who saved the address can still watch it until the review
  is deleted for good. This matters most for a video hidden after a report.
  Possible fix, for the team to agree first: make the bucket private and
  have the backend give out short-lived links only for reviews a visitor
  may see. Check whether review photos need the same change.
