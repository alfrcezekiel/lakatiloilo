# Spec: Iloilo Tourism Platform

## Problem
Travelers planning weekend trips around Iloilo Province cannot easily find diverse destinations—mountains, food spots, walking areas, parks, festivals, and heritage sites—AND places to stay because information is scattered across Facebook, Google, and random websites. They often miss great spots and good accommodations, only discovering them when friends mention them later.

## Solution
A full-stack platform with a Next.js frontend and NestJS backend, where users can browse diverse destinations (mountains, foods & dine-ins, walking areas, festivals, nature & parks, heritage sites) and accommodations (hotels, condominiums) in Iloilo Province. The backend provides versioned APIs with spatial query capabilities for location-based searches.

The home page opens on a redesigned hero where travelers can type a place name and get live suggestions as they type, and narrow those suggestions with category chips and a City/Province toggle.

While places are still being fetched from the NestJS backend, the site shows skeletons — grey, gently pulsing placeholders shaped like the real cards — so travelers can see the page is working and nothing jumps when the real content arrives.

Travelers who create an account can rate any destination or accommodation from 1 to 5 stars and write a short review. Everyone, with or without an account, can read the reviews and see each place's average rating on its detail page.

The login page also helps travelers look after their account: a password strength bar, a "Forgot password?" email link, and a "Remember my email" choice. At sign-up, travelers say whether they are a local, a visitor from the Philippines or a foreign tourist, and their reviews show it.

Backend round: every request for the app's own data goes through the NestJS backend. The home page gets its places from the backend on the server, so it arrives with places already in it. Reviews (reading, writing, editing, deleting) and creating an account or logging in also go through the backend's own endpoints, so all of the app's data requests live in one place the team can read and check.

Own login round: the website keeps its own copy of the traveler's login instead of handing it to Supabase's browser library. "Who is logged in", keeping the login fresh, and logging out go through the NestJS backend's own endpoints, so normal pages no longer send requests to Supabase Auth. Travelers see the same screens.

## The user
Travelers planning weekend trips around Iloilo Province. No login required for browsing; an account is needed only to write a review.

## User stories
1. As a traveler, I want to browse destinations organized by category (mountains, foods, walking areas, festivals, nature, heritage) and location (Iloilo City vs. Province), so that I can discover places to visit in the area I'm interested in.
2. As a traveler, I want to click a category chip under the search bar so that the search only suggests that kind of place, so that I can focus on the kind of trip I'm planning.
3. As a traveler, I want to see live suggestions while I type a place name in the search bar, so that I can jump straight to a place I've heard about.
4. As a traveler, I want to see a list of hotels and condominiums with photos and details, so that I can find a place to stay.
5. As a traveler, I want to click a destination or accommodation to see its full details (name, address, photo, description, contact info), so that I can learn more about it.
6. As a traveler, I want to browse without creating an account, so that I can quickly find information.
7. As a developer, I want the backend to provide versioned APIs (/v1, /v2) with PostGIS spatial queries, so that future API changes don't break existing clients and we can support location-based features later.
8. As a visitor, I want to see a branded footer with Lakat Iloilo name and navigation links, so that I can easily navigate to different sections and understand the platform's identity.
9. As a traveler on a slow phone connection, I want to see the shape of the page while places load from the backend, so that I know the site is working and the page doesn't jump around.
10. As a traveler, I want to create an account with my email and a password, so that I can write reviews.
11. As a logged-in traveler, I want to give a destination or accommodation 1 to 5 stars and a short review, so that other travelers know what it is like.
12. As any visitor, I want to see a place's average rating and its reviews on its detail page without logging in, so that I can decide whether to go.
13. As a traveler signing up, I want to see how strong my password is, so that I choose one that keeps my account safe.
14. As a traveler signing up, I want to say whether I'm a local, a visitor from the Philippines or a foreign tourist, so that people reading my reviews know where I'm coming from.
15. As a returning traveler, I want the login page to remember my email, so that logging in again is quicker.
16. As a traveler who forgot my password, I want to get a reset link by email and choose a new password, so that I can get back into my account.
17. As a traveler, I want the home page to arrive with places already in it, so that it feels fast on my phone.
18. As a developer, I want reviews and log-in to go through our own NestJS endpoints, so that all the app's data requests are in one place I can read and check.
19. As a developer, I want "who is logged in", keeping the login fresh and logging out to go through our own NestJS endpoints, so that normal pages never talk to Supabase Auth directly.

## Screens
1. Home page hero — redesigned to match the team's mockup:
   - A small spaced-out label "ILOILO CITY · ILOILO PROVINCE", a large serif headline "Lakat na, *Iloilo.*" with "Iloilo." in italics, and the intro paragraph.
   - A wide rounded glass search bar with three parts:
     - **Where to?** — a text box. As the traveler types, a dropdown shows up to 6 matching destinations and accommodations (matched on name and address), each with its name, category and area. Clicking a suggestion (or picking it with the arrow keys and Enter) puts that place in the box and closes the list; Escape closes it. If nothing matches, it says "No matches". Suggestions respect the chosen category and location.
     - **Category** — shows the category chosen with the chips. Read-only: the chips are the only way to change it.
     - **All / Iloilo City / Province** toggle — narrows the suggestions only. It is separate from the location filter further down the page: changing one never changes the other.
   - A white **Explore** button (or Enter) that opens the detail page of the picked place, or of the best match for what was typed. With an empty box it shows a hint instead; with no matches it shows "No matches".
   - Category chips under the bar: All, Mountains, Food, Festivals, Hotels, Condominiums, Walking Areas, Nature & Parks, Heritage Sites. Clicking a chip highlights it, shows it in the search bar's Category field and narrows the suggestions to that category. It does not change the category cards or list sections further down the page, which keep their own behaviour: every section is visible, and clicking a category card scrolls to its section.
   - Two wide glass cards, **Featured** (Dinagyang Festival) and **Trending** (Bucari Little Baguio, a mountain with a real photo), each with photo, badge, name and a "View details →" link to its detail page. Both come from real data, not hard-coded examples.
   - The navbar keeps the current Lakat Iloilo PNG logo.
2. Home page (rest) — shows welcome text, navigation bar, About Iloilo section, Features section, category cards (mountains, food, walking, festivals, nature, heritage, hotels, condominiums) with location filter (All/Iloilo City/Iloilo Province), separate list sections for each destination category, and accommodations list. Clicking a category card scrolls to that category's section; all sections are always visible. The category cards use real photos from Iloilo City and Province. Frontend calls NestJS API to fetch data.
3. Destination detail page — shows destination name, address, coordinates, photo, and description. Data fetched from NestJS API.
4. Accommodation detail page — shows accommodation name, address, phone, email, photo, and description. Data fetched from NestJS API.
5. Footer — shows Lakat Iloilo branding with platform name, copyright information, navigation links (Home, About, Features, Explore), and legal section with a "Photo credits" link. Background uses teal/emerald gradient to match the overall theme.
6. Photo credits page — lists the photographer and licence of every real Iloilo photo the site uses, as their Creative Commons licences require. Reached from the footer.
7. Loading skeletons — shown only while the NestJS backend requests are still in flight:
   - **Home page:** the hero text, chips, About and Features sections appear straight away (they need no data). The Featured and Trending cards each show a skeleton card the same size as the real one. Every list section (the six destination categories and Accommodations) shows its title and 3 skeleton cards. The category cards show a placeholder instead of their place count, never "0". Typing in Where to? says "Loading places…" instead of "No matches".
   - When the data arrives, each skeleton is replaced by the real card in the same spot. If loading fails, the skeletons disappear and the existing "We couldn't load places" message shows. A section that turns out to have no places stays hidden, as today.
   - **Destination and Accommodation detail pages:** while the page loads, a skeleton laid out like the real page — photo block, title bar, a few text lines and the back button.
   - Screen readers announce "Loading places". For visitors with "reduce motion" turned on, the skeletons stay still instead of pulsing.
8. Sign up / Log in page — one page with two modes. Sign up asks for a display name, email and password; Log in asks for email and password. After logging in, the traveler goes back to the page they came from. The navbar shows "Log in" when logged out, and the display name with "Log out" when logged in. Browsing never asks anyone to log in.
9. Reviews section — on every destination detail page (including Foods & Dine-ins) and every accommodation detail page, below the existing details:
   - The average rating as stars (for example "★ 4.3") and the number of reviews, or "No reviews yet".
   - The reviews, newest first: reviewer's display name, stars, text and date. Email addresses are never shown.
   - Logged in: a form to pick 1–5 stars and write up to 500 characters. One review per traveler per place; a traveler who already reviewed sees their review with Edit and Delete instead of the form.
   - Logged out: a "Log in to write a review" link that comes back to this page after login.
10. Features section — gains a "Reviews & ratings" card, and the "No Login Required" card becomes "Browse freely, log in only to review", so the section describes what the site really does.
11. Sign up / Log in page, login extras round — the page gains:
   - **Sign up – "I'm traveling as":** three choices, Local Ilonggo, Visitor from PH and Foreign tourist. Picking one is required.
   - **Sign up – password strength bar:** under the password field, a bar showing Weak, Okay or Strong, based on length and on mixing letters, numbers and symbols. It is only a hint; the 8-character minimum stays the real rule.
   - **Log in – "Remember my email":** a checkbox, unticked by default. Travelers always stay logged in until they log out, whether or not they tick it. Ticked, this browser remembers their email (never the password), so after logging out the login page comes back with the email filled in and the box ticked; unticked, any remembered email is forgotten. (Was "Keep me logged in", which logged unticked travelers out when the browser closed; renamed and changed on 2026-10-24 at the team's request.)
   - **Log in – "Forgot password?":** a link to the Forgot password page.
12. Forgot password page — the traveler types their email and presses "Send reset link". The page always answers "If that email has an account, we've sent a link", so it never reveals who has an account.
13. Set new password page — opened from the link in the email. The traveler chooses a new password (with the strength bar) and presses "Save new password". A pop-up then says whether it worked: "Password changed" with a "Go to log in" button, or "Password not changed" with the reason and "Try again" (or "Send me a new link" when the link has expired). Opening the link or saving never logs anyone in, in this tab or any other; the traveler logs in with the new password on the log-in page. (Changed on 2026-10-24: it used to log the traveler in and take them home.) An expired or already-used link shows a clear message and a way to ask for a new one.
14. Reviews section, login extras round — each review shows the reviewer's traveler type as a small tag after their name, for example "Juan · Local Ilonggo". Reviews from accounts without a traveler type show no tag.
15. Backend round — everything looks and works the same for travelers; only where the requests go changes:
   - **Home page:** the Next.js server asks the NestJS backend for the places before sending the page. Skeletons, the "We couldn't load places" message, search, chips and filters behave as before.
   - **Reviews section:** reading, writing, editing and deleting reviews go through the backend instead of straight to Supabase. Messages such as "one review per place" stay the same.
   - **Sign up / Log in page:** creating an account and logging in go through the backend. Creating an account does not log the traveler in: an "Account created" pop-up says "Welcome to Lakat Iloilo, <name>! Your account is ready. Log in with your email and password to start writing reviews." Its "Go to log in" button opens Log in with empty fields: the traveler types their own email and password. After logging in, the traveler is logged in exactly as before (navbar name, "Remember my email"). (Changed on 2026-10-27 at the team's request: signing up used to log the traveler in straight away.)
   - **Forgot password, Set new password and Log out:** no change; they stay in the browser.
16. Own login round — everything looks the same for travelers; only where the requests go changes:
   - **Log in:** after a successful log-in, the website keeps the login itself instead of handing it to Supabase's browser library (which used to check it with Supabase straight away).
   - **Navbar and Reviews section:** they learn who is logged in from the backend's "who is logged in" endpoint: the navbar's "Hi, <name>", and Edit and Delete on the traveler's own review.
   - **Staying logged in:** a login runs out after about an hour, so the website quietly renews it through the backend before then. Travelers still stay logged in until they log out.
   - **Log out:** asks the backend to end the login on this device only, then the website forgets its copy and shows "Log in". If the backend cannot be reached, the traveler is still logged out in this browser.
   - **Other open tabs** notice logging in and out, as before.
   - **Forgot password and Set new password:** no change; they still talk to Supabase from the browser.
   - **Once, after this goes live:** travelers who are logged in will need to log in again, because the website stops reading Supabase's old copy of the login.

## Data

**destinations table:**
- id — unique identifier for each destination
- name — the destination's name (e.g., "Bucari Little Baguio")
- address — text address (e.g., "Leon, Iloilo")
- latitude — coordinate for PostGIS spatial queries
- longitude — coordinate for PostGIS spatial queries
- location — PostGIS geography point (from lat/long)
- photo_url — link to the place's photo: a real photo from Wikimedia Commons where one exists (credited on the Photo credits page), otherwise a stock photo until the team uploads their own to Supabase Storage
- description — short text about the destination
- category — category type (one of: "mountain", "food", "walking", "nature", "festival", "heritage")
- location_type — location type (one of: "iloilo_city", "iloilo_province")
- created_at — timestamp
- updated_at — timestamp

**accommodations table:**
- id — unique identifier for each accommodation
- name — the accommodation's name (e.g., "Hotel del Rio")
- address — text address (e.g., "Iloilo City")
- phone — contact phone number
- email — contact email address
- latitude — coordinate for PostGIS spatial queries
- longitude — coordinate for PostGIS spatial queries
- location — PostGIS geography point (from lat/long)
- photo_url — link to the place's photo: a real photo from Wikimedia Commons where one exists (credited on the Photo credits page), otherwise a stock photo until the team uploads their own to Supabase Storage
- description — short text about the accommodation
- type — accommodation type (set to "hotel" or "condominium" for MVP)
- location_type — location type (one of: "iloilo_city", "iloilo_province"); used by the location filter, same as destinations
- created_at — timestamp
- updated_at — timestamp

Row Level Security policy: Anyone may read all rows in both tables. No one may write through the app (data is added via SQL scripts by the team).

Live suggestions and the category chips use columns that already exist (`name`, `address`, `category`, `type`, `location_type`) on data the home page already loads. No table changes and no new API endpoint.

Loading skeletons need no data changes either: no new tables, columns or API endpoints, and the Row Level Security policy is unchanged. They use the same backend requests the pages already make.

**reviews table:**
- id — unique identifier for each review
- place_type — which kind of place is reviewed (one of: "destination", "accommodation")
- place_id — the id of that destination or accommodation
- user_id — the account that wrote the review (from Supabase Auth)
- reviewer_name — the display name shown on the review, taken from the account
- traveler_type — the reviewer's traveler type, taken from the account (one of: "local", "domestic", "foreign"), or empty for accounts that have none. Added in the login extras round.
- rating — a whole number from 1 to 5
- comment — the review text, up to 500 characters
- created_at — timestamp
- updated_at — timestamp
- One review per account per place (user_id, place_type and place_id together are unique).

Row Level Security policy for reviews: anyone may read every review. Only a logged-in traveler may add a review, and only with their own user_id. Only the traveler who wrote a review may edit or delete it. No one else can change it.

Backend round: the browser no longer reads or writes reviews directly. It calls the NestJS backend, which reads and writes the reviews table with TypeORM through its own database login (lakat_api, see supabase/sql/016 and 023), not through Supabase's data API. Reading is allowed by an "api can read reviews" policy. For writing, editing and deleting, the backend first checks the traveler's login token with Supabase Auth (using the publishable key), then, inside one transaction, tells the database which traveler it is and switches to Supabase's "authenticated" role. So the Row Level Security policy above still decides who may change what, exactly as before. lakat_api is NOINHERIT: it only has the "authenticated" rights during that switch. The backend never uses the `service_role` key or any `sb_secret_` key. No tables, columns or policies change in this round. Account details (email, password) live in Supabase Auth and are never stored in the reviews table.

Own login round: no tables, columns or policies change, and there is no new SQL. Account details stay in Supabase Auth; the backend talks to it with the publishable key and the traveler's own login only. The website's copy of the login is kept in this browser's storage, never in the database (Supabase's library also kept it where the page can read it, so this is no less safe). Every logged-in traveler's hourly renewal now reaches Supabase from the backend's one address, so the team raises Supabase's "token refreshes" rate limit if travelers start being logged out early.

(Before the backend round, the browser read and wrote reviews directly through Supabase with the same keys and the same Row Level Security policy.)

The traveler type is saved on the Supabase Auth account, next to the display name. The database copies it onto each review, the same way it copies reviewer_name, so it can never be typed in from the browser. The reviews Row Level Security policy is unchanged.

PostGIS extension: Enabled on Supabase database. The `location` column stores geography points for spatial queries (e.g., find destinations within X km of a point).

## API Endpoints (NestJS Backend)

**Version 1 (/v1):**
- GET /v1/destinations — returns all destinations (supports query params: category, location_type)
- GET /v1/destinations/:id — returns single destination by ID
- GET /v1/destinations/near — returns destinations within radius (params: lat, lng, radius_km, category)
- GET /v1/accommodations — returns all accommodations (supports query params: type)
- GET /v1/accommodations/:id — returns single accommodation by ID
- GET /v1/accommodations/near — returns accommodations within radius (params: lat, lng, radius_km, type)

**Backend round (v1):**
- GET /v1/reviews?place_type=…&place_id=… — anyone; a place's reviews, newest first
- POST /v1/reviews — logged-in traveler; adds their review (place, stars, comment). The browser sends new reviews only to this NestJS endpoint, never to Supabase's data API (`/rest/v1/reviews`) directly, and the backend writes them with TypeORM, not through the data API either; the backend answers with the saved review, or a plain message such as "You've already reviewed this place." (401 not logged in, 400 stars or comment outside the limits, 409 already reviewed)
- PATCH /v1/reviews/:id — logged-in traveler; edits their own review (stars, comment) and answers with it
- DELETE /v1/reviews/:id — logged-in traveler; deletes their own review (answers 200 with { id, message: "Your review has been deleted." }; the page shows that message above the review form)

Adding, editing and deleting all run through TypeORM as the logged-in traveler, so Row Level Security decides. For someone else's review, editing and deleting change nothing and the backend answers 404 "We couldn't find that review among yours." The browser never sends reviews to Supabase's data API directly.
- POST /v1/auth/signup — anyone; creates an account (display name, traveler type, email, password) through Supabase Auth and answers { created: true, needs_confirmation }. It does not log anyone in: Supabase logs a new account in straight away, so the backend ends that login at once
- POST /v1/auth/login — anyone; logs in through Supabase Auth and answers { session }, the login for the browser to keep (it stores it with supabase.auth.setSession)

When Supabase Auth refuses, the backend answers with Supabase's own status and code (for example 400 "invalid_credentials", 422 "user_already_exists", 429 "over_request_rate_limit"), so the website shows its usual plain messages. The password is passed straight on to Supabase Auth: the backend never stores, logs or sends it back.

**Own login round (v1):**
- GET /v1/auth/me — logged-in traveler; answers 200 { id, display_name, traveler_type, email } for the traveler whose login it is (401 "Please log in, then try again." without a valid login). It never lists other accounts: that would need the service_role key
- POST /v1/auth/refresh — the website, sending the login's renewal code (refresh token); answers 200 { session }, a renewed login (401 "Your login has ended. Please log in again." when the renewal code is no longer valid, for example after logging out)
- POST /v1/auth/logout — logged-in traveler; ends their login on this device only, so its renewal code stops working, and answers 200 { message: "You're logged out." } (401 without a valid login)

"Logged-in traveler" means the request carries the traveler's login token; the backend passes it on to Supabase, where Row Level Security checks it. Password reset and log-out stay in the browser.

**Version 2 (/v2):**
- Reserved for future API changes. v1 remains available to prevent breaking existing clients.

**CORS:** Configured to allow requests from the Next.js frontend domain. From the backend round it also accepts adding, editing and deleting (not only reading), still only from the site's own addresses.

## Architecture

**Frontend (Next.js):**
- App Router + TypeScript
- Tailwind CSS with UI components in `src/components/ui/`
- Fetches data from NestJS backend via HTTP calls (the home page on the server from the backend round, like the detail pages)
- Deployed on Vercel

**Backend (NestJS):**
- Separate NestJS project in `backend/` directory
- TypeORM or Prisma for Supabase database access
- API versioning modules (v1, v2)
- PostGIS integration for spatial queries
- Deployed on Vercel at https://api-lakat-iloilo.vercel.app
- Backend round: also needs the Supabase URL and the publishable (anon) key as settings, locally and in Vercel, to check travelers' login tokens with Supabase Auth (reviews themselves go through TypeORM)
- Backend round: the reviews and log-in endpoints are built in the NestJS backend, which runs on the server and answers with data (JSON). The Next.js frontend calls them from the browser (the client side) and shows the results; the home page's places are fetched by the Next.js server instead
- Own login round: the "who is logged in", renew-login and log-out endpoints are also in the NestJS backend, next to sign-up and log-in. The website keeps the login itself and sends it to the backend; only the Forgot password and Set new password pages still use Supabase's browser library

**Database (Supabase):**
- Hosted PostgreSQL with PostGIS extension
- Row Level Security enabled
- Storage for images
- Accessed by NestJS backend using environment variables, through a read-only database login (`lakat_api`, see `supabase/sql/016`)

## Login
Browsing needs no login. Writing, editing or deleting a review needs an account: Supabase Auth with email and password, plus a display name chosen at sign-up. No social logins.

Login extras round: travelers can reset a forgotten password through Supabase's reset email (the built-in email sender, which allows only a few emails an hour; fine for the demo). The Forgot password and Set new password pages' addresses, on localhost and on the live URL, are added to Supabase's allowed redirect URLs. Travelers stay logged in until they log out; "Remember my email" only fills in the email on the login page.

Backend round: signing up and logging in go through the backend's endpoints, which call Supabase Auth. Signing up does not log the traveler in; after logging in, the browser keeps the login as before. Password reset and log-out stay in the browser (the reset link only works in the browser that asked for it).

Own login round: the website keeps its own copy of the login. "Who is logged in", renewing the login (about once an hour) and logging out go through the backend; log out ends the login on this device only. Password reset stays in the browser with Supabase.

## Done for the demo
- [x] NestJS backend project structure created in `backend/` directory
- [x] Supabase database with PostGIS extension enabled
- [x] destinations and accommodations tables created with spatial columns
- [x] Seed data: 5-10 destinations and 5-10 accommodations inserted via SQL
- [x] NestJS v1 API endpoints implemented and tested
- [x] Spatial query endpoint (/near) working with PostGIS
- [x] CORS configured for Next.js frontend
- [x] Next.js frontend modified to call NestJS APIs instead of direct Supabase
- [x] Home page displays destinations and accommodations from backend
- [x] Destination and accommodation detail pages working
- [x] Both frontend and backend deployed live
- [x] Elizabeth and Mark have tested the app

**Hero redesign round (live URL):**
- [x] Hero matches the mockup on desktop and looks tidy on a phone
- [x] Typing "din" in Where to? shows Dinagyang Festival; picking it fills the box, and Explore opens its detail page
- [x] Suggestions work with the keyboard (arrows, Enter, Escape) and say "No matches" when empty
- [x] Clicking a chip updates the Category field and narrows the suggestions; the sections further down stay unchanged
- [x] The City/Province toggle in the search bar narrows the suggestions and does not change the filter further down (and vice versa)
- [x] Featured and Trending cards show real places and link to their detail pages

**Loading skeletons round (live URL):**
- [x] With the browser set to "Slow 4G", the home page shows skeletons, then real cards, with no layout jump
- [x] Category cards never show "0" while places are loading
- [x] Where to? says "Loading places…", not "No matches", while places are loading
- [x] Destination and accommodation detail pages show their skeleton before the content
- [x] With the backend unreachable, skeletons disappear and the error message shows

**Reviews and ratings round (live URL):**
- [x] A new traveler can sign up with a display name, email and password, then log in and log out
- [x] A logged-in traveler can rate a destination and an accommodation 1–5 stars with a short review, and sees it appear straight away
- [x] The same traveler can edit and delete their own review, and cannot leave a second review for the same place
- [x] A logged-out visitor sees the average rating and reviews, plus "Log in to write a review"
- [x] Trying to change someone else's review is refused by the database (Row Level Security), not just hidden in the page
- [x] The Features section shows the "Reviews & ratings" card

**Login extras round (live URL):**
- [x] Typing a password at sign-up moves the strength bar from Weak to Strong
- [x] A new traveler picks "I'm traveling as", and their review shows that tag
- [x] "Remember my email" starts unticked; ticked, the login page shows the email after logging out; either way, the traveler stays logged in after closing and reopening the browser
- [x] "Forgot password?" sends an email; its link opens the Set new password page, and the new password works for logging in
- [x] An expired or used reset link shows a clear message, not a crash

**Backend round (live URL):**
- [x] The home page shows places without the browser asking the backend's place endpoints (checked in the browser's Network tab)
- [x] On "Slow 4G", skeletons still show and are replaced with no layout jump; with the backend unreachable, "We couldn't load places" shows
- [x] Signing up, logging in, and writing, editing and deleting a review all work, and the Network tab shows those requests going to the backend
- [x] Trying to edit someone else's review through the backend is refused by the database (Row Level Security)
- [x] Log out, Forgot password and "Remember my email" still work

**Own login round (live URL):**
- [ ] Logging in, opening detail pages and logging out send no requests to Supabase Auth (no /auth/v1/user, /auth/v1/logout or /auth/v1/token in the Network tab)
- [ ] The navbar's "Hi, <name>" comes from the backend's "who is logged in" endpoint
- [ ] A traveler who stays on the site for more than an hour is still logged in and can still write a review (the renewal works)
- [ ] Log out goes to the backend; the navbar shows "Log in", and the same login is still active on another device
- [ ] Writing, editing and deleting a review still work, and other open tabs notice logging in and out
- [ ] Forgot password and "Remember my email" still work

## Out of scope
- Login for anything other than reviews (browsing stays open to everyone)
- Changing the traveler type after sign-up (needs a profile page), and a custom email sender for reset emails
- Social logins, profile pages, photos in reviews, replies, likes or reporting reviews
- Star ratings on the home page cards, and filtering or sorting by rating
- Booking/payments for any services
- Map integration (PostGIS added for future use, but no map UI in MVP). A Mapbox map is parked in docs/LATER.md until the team decides on it
- A full search results page, advanced filters, or searching inside descriptions (live suggestions match names and addresses only)
- Admin UI for managing data
- Social features (sharing, favorites)
- Advanced spatial queries beyond radius search
- Password reset through the backend, "Nearby places" using the /near endpoints, and keeping the backend address private (all parked in docs/LATER.md)
- Listing all users (needs the service_role key, which this project never uses) and logging out of every device at once
- Blurred photo previews, speeding up the backend, and skeletons on the Photo credits page (it has no data to wait for)
