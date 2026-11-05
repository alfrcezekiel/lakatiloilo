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

Polish round: the same pages and features, made clearer and smoother. Every icon comes from one icon set (Lucide) instead of emoji, cards and sections move gently into view (and stay still for travelers who turn on "reduce motion"), and a place's reviews show straight away when a traveler comes back to it.

Navigation round: moving between pages feels smoother. The new page fades in quickly, and the logged-in parts of the page (the navbar's name, the review form and Edit/Delete buttons) show straight away after the first check instead of after a brief wait. Login renewal works exactly as before.

Buttons & cards round: every button on the detail pages gets one modern, easy-to-read style, with a warm sunset-amber main button. Every place card on the home page shows its star rating and a clear "View details" button.

Profiles & likes round: every reviewer has a profile page that anyone can open from their name, with their traveler type and all their reviews. Logged-in travelers can mark other travelers' reviews as "Helpful". On the detail pages, Back to Home stays in the corner while scrolling, so leaving a place never means scrolling back up.

Review extras round: logged-in travelers can reply to a review, report a review to the team, and add one photo to their own review.

Likes on TypeORM round: travelers see no change. The backend describes the review_likes table to TypeORM, like the other tables, and reads and writes Helpful likes through it instead of hand-written SQL, so the likes code is easier to read, change and trust.

Threaded replies round: logged-in travelers can answer a reply, not only a review. Answers show indented under the reply they answer, so a conversation is easy to follow, and replies sit directly on the review card without a pale box behind each one.

Live updates round: pages keep themselves up to date. When a destination or accommodation is added, changed or removed, or another traveler writes, edits or deletes a review, a reply, a photo or a Helpful mark, the open page shows it within a few seconds, without the traveler reloading. Supabase Realtime is only the doorbell that says "something changed"; the page then asks the NestJS backend again, so all data still comes through the backend.

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
20. As a traveler, I want the main action on a detail page to stand out, so that I know at a glance what to tap (Call, Post review).
21. As a traveler, I want to see a place's star rating on its home page card, so that I can compare places before opening them.
22. As a traveler reading a long detail page, I want Back to Home always in reach, so that I can leave without scrolling back up.
23. As any visitor, I want to open a reviewer's profile and see all their reviews, so that I can judge whether their taste matches mine.
24. As a logged-in traveler, I want to mark a review as helpful, so that the most useful reviews stand out.
25. As a logged-in traveler, I want to reply to a review, so that I can answer a question or add a tip.
26. As a logged-in traveler, I want to report a review that is spam or offensive, so that the team can deal with it.
27. As a logged-in traveler, I want to add a photo to my review, so that others can see what the place is really like.
28. As a developer, I want the review_likes table described and used through TypeORM like the other tables, so that the likes code is easier to read, change and trust.
29. As a logged-in traveler, I want to answer someone's reply and see answers indented under it, so that I can follow and join a conversation under a review.
30. As a traveler, I want new, changed and removed destinations and accommodations, and their ratings, to show on the open page by themselves, so that I never plan around old information.
31. As a traveler reading a place's reviews, I want other travelers' new reviews, replies, photos and Helpful marks to appear by themselves, so that I can follow the conversation without reloading.

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
   - **Look (both detail pages, "Option 1A" of the Detail Pages Glass design):** a tall photo with two glass chips (category or type, and Iloilo City / Iloilo Province), the name in large Fraunces letters with the last word in italics, and the address. Under it, three glass tiles (Category or Type, Area, Rating with the average stars and review count), then About and Reviews with serif headings. A glass side panel sits on the right on a laptop and rises into the photo; on a phone it comes after About. Accommodations: "Get in touch" with a white Call button, a glass "Email the front desk" button, then address, phone and email (buttons only for the contacts that exist). Destinations: "Plan your visit" with address and coordinates. Accommodations use a blue/indigo background, destinations teal/emerald.
5. Footer — shows Lakat Iloilo branding with platform name, copyright information, navigation links (Home, About, Features, Explore), and legal section with a "Photo credits" link. Background uses teal/emerald gradient to match the overall theme.
6. Photo credits page — lists the photographer and licence of every real Iloilo photo the site uses, as their Creative Commons licences require. Reached from the footer.
7. Loading skeletons — shown only while the NestJS backend requests are still in flight:
   - **Home page:** the hero text, chips, About and Features sections appear straight away (they need no data). The Featured and Trending cards each show a skeleton card the same size as the real one. Every list section (the six destination categories and Accommodations) shows its title and 3 skeleton cards. The category cards show a placeholder instead of their place count, never "0". Typing in Where to? says "Loading places…" instead of "No matches".
   - When the data arrives, each skeleton is replaced by the real card in the same spot. If loading fails, the skeletons disappear and the existing "We couldn't load places" message shows. A section that turns out to have no places stays hidden, as today.
   - **Destination and Accommodation detail pages:** while the page loads, a skeleton laid out like the real page — photo block with chips, title and address, three tiles, a few text lines, the side panel and the back button.
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
   - **Once, after this goes live:** travelers who are logged in will need to log in again, because the website stops reading Supabase's old copy of the login. Their old Supabase login is ended through the backend and removed from the browser at the same time.

17. Polish round — same pages and features, with clearer icons, smoother movement and faster reviews:
   - **Icons everywhere:** the emoji on the Features cards and the category cards, the address pin, the menu's close button, the back and "View details" arrows and the footer heart become matching Lucide icons. Stars stay gold.
   - **Detail pages:** the chips, title and address fade up when the page opens. The tiles, About, the side panel and Reviews fade in and out as described below. (Changed on 2026-11-02 at the team's request: Reviews stays visible while any part of it is on screen, instead of fading out when less than 15% of it shows. Threaded replies make it much taller than a phone screen, so it used to vanish at the bottom of the page and while typing a reply with the keyboard open.) A new review slides in at the top of the list; a deleted one shrinks away.
   - **Home page and detail pages, text and cards (change 2026-11-01, team request):** what is on screen rises into view when the page loads or is refreshed. Scrolling down, text and cards rise up into view (fade up); scrolling back up, they come down into view from above (fade down). This happens every time they come back on screen: they fade out when they leave. Cards in one row arrive one after another. On the home page this covers the hero text, search bar and chips, the Featured and Trending cards, Why Iloilo, the Features cards, the category cards, and every list heading and place card. Cards lift slightly on hover.
   - **Navbar menu on phones:** slides open and closed instead of appearing at once.
   - **Reviews load faster on a return visit:** going back to a place seen in the last minute shows its reviews straight away while fresh ones load quietly. After writing, editing or deleting a review, the Rating tile and the list update at once.
   - **Reduce motion:** with "reduce motion" turned on, nothing slides or fades; content just appears.

18. Navigation round — same pages and features, with smoother moves between pages:
   - **Moving between pages:** opening a place, going back home, or opening the login or photo credits page makes the new page fade in quickly (about a third of a second). The fade-ups inside each page still play as before.
   - **Logged-in parts show at once:** after the first check, moving between pages shows the navbar's "Hi, <name>" and the Reviews section's form or Edit/Delete buttons straight away, without a brief wait. Logging in or out in another tab still updates this tab.
   - **Reduce motion:** with "reduce motion" turned on, pages just appear.

19. Buttons & cards round — modern buttons on the detail pages, and ratings plus "View details" on the home page cards:
   - **One button style for both detail pages**, in three kinds:
     - **Main:** solid sunset amber with dark lettering, pill-shaped, at least 44 px tall so it is easy to tap, with a Lucide icon on the left. It lifts slightly on hover, presses in when clicked, and shows a clear outline when reached with the keyboard. While saving it shows a spinner and a word like "Posting…".
     - **Second:** glass (see-through white) with white lettering, same shape.
     - **Danger:** red outline; it turns solid red only on the "Yes, delete" step.
   - **Lettering:** the site's normal font, semibold, slightly larger than before, in sentence case ("Post review", not "POST REVIEW").
   - **Which buttons change:** Back to Home; on accommodations, Call (main) and Email the front desk (second); on both pages, Post review, Cancel, Edit, Delete and "Log in to write a review".
   - **Home page cards:** every destination and accommodation card in the list sections gets an amber **View details →** button at the bottom. The whole card stays clickable; the button just makes that obvious. The Featured and Trending "View details" links get the same look.
   - **Star rating on cards:** under the name, "★ 4.3 · 12 reviews", or "No reviews yet". Featured and Trending show it too.
   - **Reduce motion:** with "reduce motion" turned on, buttons do not lift or press; they only change colour.

20. Profiles & likes round — Back to Home that follows you, traveler profiles, and "Helpful" likes:
   - **Back to Home follows you down:** on both detail pages and their loading skeletons, the glass Back to Home pill stays pinned in the top-left corner of the screen while scrolling, on a laptop and a phone. Its glass is a little darker so it stays readable over light photos and text, and it always sits above the page content.
   - **Traveler profile page:** opened by clicking a reviewer's name in any review. Shows the display name in large serif letters, the traveler type tag (for example "Local Ilonggo"), how many reviews they have written, and their reviews, newest first. Each review shows the place's name (linking to the place), stars, text, date and Helpful count. Email is never shown. An unknown traveler, or one with no reviews, shows "We couldn't find this traveler" and a Back to Home button.
   - **My profile and log out:** logged in, the navbar shows a round profile icon beside Explore (on tablets and laptops). Clicking it opens a small glass dropdown headed by the traveler's name in the serif heading font, then **My profile** and **Log out**; it closes after choosing, with Escape, or by clicking anywhere else. The phone menu lists the name (also in serif), My profile and Log out directly. My profile opens the traveler's own profile; with no reviews yet, it shows their name, traveler type and "You haven't written any reviews yet." Logged out, the navbar shows "Log in" as before. (Changed on 2026-11-01 at the team's request: "Hi, <name>" and "Log out" used to sit in the bar as text; the dropdown then dropped its "Logged in as" label for the name alone.)
   - **Helpful likes on every review:** logged in, a small glass **Helpful · 3** button with a thumbs-up icon that turns amber when marked and back when clicked again. Logged out, only the count as text ("3 travelers found this helpful", or "No one has marked this helpful yet" when it is 0). On a traveler's own review, only the count: nobody can mark their own review. With "reduce motion" turned on, the button only changes colour.

21. Review extras round — replies, reports and photos in reviews:
   - **Replies:** under each review, its replies, oldest first: the replier's name (linking to their profile), traveler type tag, text and date. Logged-in travelers get a **Reply** button that opens a small form (up to 300 characters). A traveler can delete their own replies. No replies to replies, and no editing. (Changed on 2026-11-02 at the team's request: replies to replies and the new look are round 23.)
   - **Report a review:** logged-in travelers see a small "Report" link on other travelers' reviews. It opens a pop-up with four reasons (Spam, Offensive, Not about this place, Other) and an optional note, then says "Thanks — the team will take a look." Reporting the same review again says "You've already reported this review." Nothing is hidden automatically; the team reads reports in the Supabase dashboard.
   - **A photo in a review:** the review form gets "Add a photo" (one photo, JPG, PNG or WebP, up to 2 MB), with a preview and a Remove button. Editing a review can add, swap or remove the photo. The photo shows under the review text, and clicking it opens it larger. Deleting a review deletes its photo too.

22. Likes on TypeORM round — no screen changes. The Helpful button, Helpful counts, profiles and the profile dropdown look and behave exactly as before.

23. Threaded replies round — replies to replies, with a new look:
   - **No box behind replies:** replies lose their pale white background and sit directly on the review card, set apart only by a thin line down their left side.
   - **Reply to a reply:** logged in, every reply gets a small **Reply** link that opens the same small form (up to 300 characters) right under that reply. The new reply shows indented under the one it answers, and the list updates at once. The Reply button under the review still adds a reply to the review itself.
   - **Threads:** answers to the same reply show newest first under it, joined by the thin left line, so a new answer appears right under the reply it answers, where its form was; "Your reply is posted." shows under the new reply. Replies to the review itself stay oldest first. (Changed on 2026-11-02 at the team's request: answers to a reply used to show oldest first, so a new answer could land below older answers and their threads.)
   - **Curved lines:** each answer drawn inside the reply it answers (levels 2 and 3) gets a small curved line branching from that reply's thin line into the answer's name, so it is clear whose reply it answers. Deeper answers keep "Replying to <name>" instead of a curve. (Added on 2026-11-02 at the team's request.) Replies can go any number of levels deep, but the indent stops growing after 3 levels; deeper replies start with "Replying to <name>" so it stays readable on a 375 px phone.
   - **Deleting:** the traveler's own reply keeps its Delete button. When it has answers under it, the confirm step says "Delete this reply and its answers?", and the whole thread under it is deleted with it.
   - Unchanged: the replier's name (linking to their profile), traveler type tag and date; no editing replies.

24. Live updates round — pages keep themselves up to date, with no reload:
   - **Home page:** when a destination or accommodation is added, changed or removed in Supabase, or a place's rating changes, the cards and star ratings update by themselves within a few seconds.
   - **Detail pages:** the place's details (name, photo, description, contact, address) update by themselves. If the place is removed, the page shows the existing "not found" message.
   - **Reviews on a detail page:** other travelers' new, edited and deleted reviews, star ratings, Helpful counts, replies and photos appear by themselves; the average rating at the top follows.
   - **Nothing is lost:** a review or reply being typed, an open Report pop-up, a delete confirm step and the scroll position stay as they are when an update arrives.
   - **Coming back:** after the phone sleeps, the tab sits in the background, or the connection drops, the page catches up by itself when it is back.
   - No new buttons or messages: updates arrive quietly. With "reduce motion" on, they just appear.

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

Polish round: no tables, columns or policies change, and there is no new SQL. Reviews are still read and written through the backend; the browser only keeps a short-lived copy (about a minute) so a place's reviews show straight away on a return visit.

Navigation round: no tables, columns or policies change, and there is no new SQL. "Who is logged in" still comes from the backend's endpoint; the browser only keeps a copy for as long as the same login is in use.

Buttons & cards round: no tables, columns or policies change, and there is no new SQL. Each place's average stars and number of reviews are worked out by the backend from the reviews table, which its database login can already read ("api can read reviews"). The Next.js server fetches them together with the places, so the home page arrives with ratings already in it.

**review_likes table (profiles & likes round):**
- review_id — the review marked helpful; the like is removed when the review is deleted
- user_id — the traveler who marked it (from Supabase Auth)
- created_at — timestamp
- One like per traveler per review (review_id and user_id together are unique).

Row Level Security policy for review_likes: anyone may read. Only a logged-in traveler may add a like, only with their own user_id, and never on their own review. Only that traveler may remove their like. No one may edit a like.

Profiles & likes round: profiles need no new table or column. A traveler's profile is built from their reviews, which already carry user_id, reviewer_name and traveler_type; their account (Supabase Auth) is only read for their own profile, through "who is logged in". So a traveler with no reviews has no public profile.

**review_replies table (review extras round):**
- id — unique identifier for each reply
- review_id — the review replied to; replies are removed when the review is deleted
- user_id — the traveler who replied (from Supabase Auth)
- replier_name and traveler_type — copied from the account by the database, the same way as on reviews, so they can never be typed in from the browser
- comment — the reply text, 1 to 300 characters
- created_at — timestamp

Row Level Security policy for review_replies: anyone may read. Only a logged-in traveler may add a reply, and only with their own user_id. Only the traveler who wrote a reply may delete it. No one may edit a reply.

**review_replies table, threaded replies round:** gains parent_reply_id — the reply being answered, or empty when the reply answers the review itself. The database refuses a parent reply that is under a different review. Deleting a reply deletes every answer under it (all levels), the same way deleting a review deletes its replies. Travelers may now send review_id, parent_reply_id and the text; everything else is still filled in by the database. The Row Level Security policy is unchanged.

**review_reports table (review extras round):**
- id — unique identifier for each report
- review_id — the reported review; reports are removed when the review is deleted
- user_id — the traveler who reported it (from Supabase Auth)
- reason — one of: "spam", "offensive", "not_about_place", "other"
- note — optional, up to 300 characters
- created_at — timestamp
- One report per traveler per review (review_id and user_id together are unique).

Row Level Security policy for review_reports: no one may read reports through the app; the team reads them in the Supabase dashboard. Only a logged-in traveler may add a report, only with their own user_id, and never on their own review. No one may edit or delete a report through the app.

**Live updates round:** no new table or column. One SQL file adds destinations, accommodations, reviews, review_likes and review_replies to Supabase's Realtime list (the supabase_realtime publication), so Supabase can announce changes to them. Row Level Security is unchanged and still decides: Realtime only tells a viewer about rows they may already read, and all five are already readable by anyone. review_reports stays off the list (nobody may read reports through the app). The browser uses Realtime only as a signal that a table changed; it never uses the rows Realtime sends.

**reviews table, review extras round:** gains photo_path — where the review's photo is kept in Storage, or empty when there is no photo. Like the stars and comment, only the review's writer may set or clear it.

**review-photos Storage bucket (review extras round):** anyone may view the photos. A logged-in traveler may upload only into a folder named after their own user_id, and only that traveler may replace or delete files there. Photos are JPG, PNG or WebP, up to 2 MB, so an upload stays under Vercel's 4.5 MB request limit. Uploads go through the backend as the logged-in traveler, so these Storage policies decide, like Row Level Security does for the tables.

Likes on TypeORM round: no database change, no new SQL, and nothing to run in Supabase; the review_likes columns and Row Level Security policies stay as in the profiles & likes round. The backend describes review_likes to TypeORM with its three columns (review_id and user_id, which together identify a like, and created_at), linked to the review it belongs to. The backend still sends only review_id: user_id and created_at are still filled in by the database from the login, and TypeORM is told never to send them (the database only lets travelers set review_id). Marking and unmarking still run as the logged-in traveler inside one transaction, so Row Level Security still decides, including refusing a like on your own review. Helpful counts and "liked by me" on reviews and profiles are read through TypeORM, with the same answers as before.

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

**Buttons & cards round (v1):**
- GET /v1/ratings — anyone; answers a list of { place_type, place_id, average_rating, review_count }, one entry per place that has at least one review (a place without reviews shows "No reviews yet"). Read-only, from the reviews table.

**Profiles & likes round (v1):**
- GET /v1/travelers/:id — anyone; answers { id, display_name, traveler_type, review_count, reviews } with their reviews newest first, each with its place's name and Helpful count (404 "We couldn't find this traveler." for an unknown traveler or one with no reviews). Never answers an email
- POST /v1/reviews/:id/like — logged-in traveler; marks the review helpful and answers { helpful_count, liked: true } (401 not logged in, 404 no such review, 400 "You can't mark your own review as helpful."). Marking twice changes nothing
- DELETE /v1/reviews/:id/like — logged-in traveler; removes their own like and answers { helpful_count, liked: false }
- GET /v1/reviews — each review also carries helpful_count, and liked_by_me when the request carries a login

**Review extras round (v1):**
- POST /v1/reviews/:id/replies — logged-in traveler; adds a reply (1–300 characters) and answers with it (401, 404 no such review, 400 outside the limits)
- DELETE /v1/replies/:id — logged-in traveler; deletes their own reply (200 { id, message: "Your reply has been deleted." }; 404 "We couldn't find that reply among yours. Please log in again and try.", like the reviews message)
- POST /v1/reviews/:id/report — logged-in traveler; reports a review with a reason and optional note (201 { message: "Thanks — the team will take a look." }; 409 "You've already reported this review."; 400 for your own review or an unknown reason)
- POST /v1/reviews and PATCH /v1/reviews/:id — also accept one photo (JPG, PNG or WebP, up to 2 MB; 400 "Please choose a JPG, PNG or WebP photo up to 2 MB.") and, when editing, removing it
- GET /v1/reviews — each review also carries its replies (oldest first) and its photo's address

**Threaded replies round (v1):**
- POST /v1/reviews/:id/replies — also accepts an optional parent_reply_id; 400 "That reply isn't under this review." when the parent reply is missing or under another review
- DELETE /v1/replies/:id — also deletes every answer under the reply; same answers and messages as before
- GET /v1/reviews — each reply also carries its parent_reply_id; the website builds the threads

**Live updates round (v1):** no endpoint changes. After a Realtime signal the website calls the same endpoints again (GET /v1/destinations, /v1/accommodations, /v1/ratings, the place's own endpoint and GET /v1/reviews).

**Change (2026-11-05, team request — evaluation A1 and B5):** no new endpoints. An id that is not a real id (for example /v1/reviews/abc or /v1/destinations/abc) answers 404 with a plain sentence ("We couldn't find that review." — or destination, accommodation, reply), the same as an unknown id; an unknown destination or accommodation also answers "We couldn't find that destination." / "…accommodation." instead of "Destination <id> not found". GET /v1/reviews without a valid place_id answers 400 "Please choose a destination or accommodation." Every answer carries X-Content-Type-Options: nosniff and X-Frame-Options: DENY, and no longer X-Powered-By.

All writes in these rounds run as the logged-in traveler (the asTraveler step), so Row Level Security and the Storage policies decide. The backend never uses the service_role key.

**Likes on TypeORM round (v1):** no endpoint changes. POST and DELETE /v1/reviews/:id/like, GET /v1/reviews and GET /v1/travelers/:id keep the same inputs, answers and refusal messages.

**Version 2 (/v2):**
- Reserved for future API changes. v1 remains available to prevent breaking existing clients.

**CORS:** Configured to allow requests from the Next.js frontend domain. From the backend round it also accepts adding, editing and deleting (not only reading), still only from the site's own addresses.

## Architecture

**Frontend (Next.js):**
- App Router + TypeScript
- Tailwind CSS with UI components in `src/components/ui/`
- Polish round: Lucide icons (`lucide-react`, already installed) for every icon; Motion (the `motion` package, formerly Framer Motion) for animations, set to follow the device's "reduce motion" setting (the fade-up of whatever is on screen when a page loads is plain CSS instead, so it never waits for the page's JavaScript and the text is in the page from the server; Motion takes over for scrolling, and only hides what is off screen once the JavaScript has loaded); TanStack Query for the reviews fetched in the browser (reading, plus writing, editing and deleting as updates to its copy). Places stay fetched on the Next.js server, and the login keeps its own code
- Navigation round: "who is logged in" is read through TanStack Query, kept per login, so every component shares one copy and logging in or out (in this tab or another) refreshes it. Login renewal (the timer, the one-tab-at-a-time lock and the retries) keeps its own code. The fade between pages is opacity only, with no movement, because a moving page wrapper would stop the floating navbar and scroll-to-top button from staying in place; the old page does not animate out (the App Router cannot keep it on screen without an experimental setting)
- Fetches data from NestJS backend via HTTP calls (the home page on the server from the backend round, like the detail pages)
- Live updates round: the browser's Supabase client also listens to Supabase Realtime, as a doorbell only: "a row in this table changed". The page then asks the backend again (reviews through TanStack Query; the home and detail pages through a server refresh). The browser never reads places or reviews from Supabase itself (team decision, 2026-11-02).
- Deployed on Vercel

**Backend (NestJS):**
- Separate NestJS project in `backend/` directory
- TypeORM or Prisma for Supabase database access
- API versioning modules (v1, v2)
- PostGIS integration for spatial queries
- Deployed on Vercel at https://api-lakat-iloilo.vercel.app
- Backend round: also needs the Supabase URL and the publishable (anon) key as settings, locally and in Vercel, to check travelers' login tokens with Supabase Auth (reviews themselves go through TypeORM)
- Backend round: the reviews and log-in endpoints are built in the NestJS backend, which runs on the server and answers with data (JSON). The Next.js frontend calls them from the browser (the client side) and shows the results; the home page's places are fetched by the Next.js server instead
- Own login round: the "who is logged in", renew-login and log-out endpoints are also in the NestJS backend, next to sign-up and log-in. The website keeps the login itself and sends it to the backend; only the Forgot password and Set new password pages still use Supabase's browser library. Any other page that finds a Supabase login left in the browser (from before this round, or from a reset link that was opened but not used) ends it through the backend's log-out endpoint and deletes it, so no normal page talks to Supabase Auth
- Likes on TypeORM round: review_likes is described to TypeORM next to destinations, accommodations and reviews (still with synchronize off, so TypeORM never changes the database). Likes are read and written through it; adding, editing and deleting reviews and the act-as-the-traveler step keep their own SQL

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

Navigation round: no change for travelers. "Who is logged in" is shared through TanStack Query; renewal (about once an hour, one tab at a time, retrying every 30 seconds) keeps its own code.

Profiles & likes, review extras and threaded replies rounds: browsing, profiles, likes counts, replies and photos are visible to everyone. Marking a review helpful, replying, reporting and adding a photo need an account, like writing a review.

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
- [x] Logging in, opening detail pages and logging out send no requests to Supabase Auth (no /auth/v1/user, /auth/v1/logout or /auth/v1/token in the Network tab)
- [x] The navbar's "Hi, <name>" comes from the backend's "who is logged in" endpoint
- [x] A traveler who stays on the site for more than an hour is still logged in and can still write a review (the renewal works)
- [x] Log out goes to the backend; the navbar shows "Log in", and the same login is still active on another device
- [x] Writing, editing and deleting a review still work, and other open tabs notice logging in and out
- [x] Forgot password and "Remember my email" still work

**Polish round (live URL):**
- [x] No emoji icons are left on the home page, detail pages, navbar or footer
- [x] Detail pages and home sections animate as described, on a laptop and a phone
- [x] With "reduce motion" turned on, nothing moves
- [x] Opening a place, going back, and opening it again shows its reviews straight away
- [x] Writing, editing and deleting a review still work, and the Rating tile updates each time
- [x] Logging in, logging out and staying logged in still work

**Navigation round (live URL):**
- [x] Moving between home, a detail page, login and photo credits fades the new page in, on a laptop and a phone
- [x] The floating navbar and scroll-to-top button stay in place during the fade
- [x] With "reduce motion" turned on, pages just appear
- [x] After logging in, moving between pages shows "Hi, <name>" and the review buttons at once
- [x] Logging in or out in one tab updates another open tab
- [x] Staying logged in for over an hour, writing reviews and logging out still work

**Buttons & cards round (live URL):**
- [x] The detail-page buttons use the new style on a laptop and a phone, and the amber main button is easy to read on both the teal and the blue pages
- [x] Moving through the page with the Tab key shows a clear outline on every button
- [x] Every home page card shows "View details" and its rating, and the rating matches the place's detail page
- [x] Writing a review, then going back home, updates that card's rating
- [x] With "reduce motion" turned on, buttons do not move

**Profiles & likes round (live URL):**
- [x] On both detail pages, Back to Home stays in the top-left corner while scrolling, on a laptop and a phone, and is readable over the photo and the text
- [x] Clicking a reviewer's name opens their profile with their traveler type and all their reviews, and each place name opens that place
- [x] The profile icon beside Explore opens a dropdown whose My profile opens the traveler's own profile (including when they have no reviews) and whose Log out logs them out; on a phone the menu lists both
- [x] A logged-in traveler can mark another traveler's review Helpful and unmark it; the count updates, and it is still marked after a refresh
- [x] A traveler cannot mark their own review, and the database refuses it even when asked directly (Row Level Security)
- [x] Logged out, the Helpful counts show but nothing can be clicked

**Review extras round (live URL):**
- [x] A logged-in traveler can reply to a review and delete their own reply; replies show to everyone
- [x] Reporting a review shows the thank-you message, reporting it again says it was already reported, and the report appears in the Supabase dashboard
- [x] A traveler can add a photo to a review, swap it and remove it, and deleting the review deletes the photo from Storage
- [x] A photo over 2 MB, or not a JPG, PNG or WebP, is refused with a clear message
- [x] Deleting someone else's reply, or uploading into someone else's photo folder, is refused by the database or Storage, not just hidden in the page

**Likes on TypeORM round (live URL):**
- [x] Marking and unmarking Helpful still works, and counts and profiles show the same numbers as before
- [x] Marking your own review is still refused by the database, checked through the backend's own login inside a transaction that is undone
- [x] The refusals for no login, a fake login and a bad id answer the same messages as before

**Threaded replies round (live URL):**
- [x] Replies have no pale box behind them, only the thin left line, on a laptop and a phone
- [x] A logged-in traveler can answer a reply; the answer shows indented right under it (newest first) at once, with "Your reply is posted." under it, and still after a refresh
- [x] Answers at levels 2 and 3 have a curved line from the reply they answer, on a laptop and a phone
- [x] Four or more levels deep, the indent stops growing, "Replying to <name>" shows, and nothing is squeezed at 375 px
- [x] Deleting a reply with answers asks "Delete this reply and its answers?" and removes the whole thread under it
- [x] Logged out, threads show but there is no Reply link
- [x] On a phone, Reviews stays visible at the bottom of the page and while typing a reply (checked by the team in a phone simulator, 2026-11-02)
- [x] Answering with a parent reply from another review is refused by the backend, and deleting someone else's reply is still refused by the database

**Live updates round (live URL):**
- [x] Adding, changing and removing a destination and an accommodation in the Supabase Table Editor shows on an open home page within a few seconds, with no reload, on a laptop and a phone
- [x] Changing a place in the Table Editor updates its open detail page; removing it shows "not found"
- [x] A review, reply, photo or Helpful mark from a second account appears on an open detail page in another browser, and editing or deleting it updates there too, with the average rating
- [x] A review or reply being typed, an open Report pop-up and the scroll position are kept when an update arrives
- [x] After the phone sleeps or the tab sits in the background, the page catches up when it comes back
- [x] Row Level Security is unchanged on all five tables, and review_reports is not in the Realtime list

## Out of scope
- Live updates round: live reports (no screen shows reports and nobody may read them through the app; seeing reports as they arrive needs an admin screen), "new review" pop-ups or sounds, live traveler profile pages, and using the rows Realtime sends directly in the page
- Likes on TypeORM round: moving the other hand-written SQL (adding, editing and deleting reviews, the act-as-the-traveler step) onto TypeORM, and any change travelers can see
- Navigation round: login renewal through TanStack Query, the old page animating out, and the experimental "view transitions" setting (parked in docs/LATER.md)
- Polish round: fetching places in the browser (parked in docs/LATER.md); "who is logged in" and page transitions moved into the navigation round
- Login for anything other than reviews (browsing stays open to everyone)
- Changing the display name or traveler type after sign-up (the profile page shows them but cannot change them: every old review copies them too), and a custom email sender for reset emails
- Social logins
- Threaded replies round: keeping answers when the reply above them is deleted ("This reply was deleted"), collapsing threads, and notifying a traveler when someone answers them
- Profiles & likes and review extras rounds: editing replies, likes on replies, hiding reported reviews automatically, any admin screen for reports, more than one photo per review, and photos over 2 MB
- Buttons & cards round: email confirmation for new accounts (parked: a custom email sender needs an outside service the team has not agreed to), and a "Get directions in Google Maps" button on destinations
- Filtering or sorting by rating (star ratings on the home page cards moved into the buttons & cards round)
- Booking/payments for any services
- Map integration (PostGIS added for future use, but no map UI in MVP). A Mapbox map is parked in docs/LATER.md until the team decides on it
- A full search results page, advanced filters, or searching inside descriptions (live suggestions match names and addresses only)
- Admin UI for managing data
- Social features (sharing, favorites)
- Advanced spatial queries beyond radius search
- Password reset through the backend, "Nearby places" using the /near endpoints, and keeping the backend address private (all parked in docs/LATER.md)
- Listing all users (needs the service_role key, which this project never uses) and logging out of every device at once
- Blurred photo previews, speeding up the backend, and skeletons on the Photo credits page (it has no data to wait for)
