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

The team moved six parked ideas into the spec on 2026-11-05, as three rounds of about one session each, built and checked live one after the other:

Profile & replies round: travelers can change their display name and traveler type from their own profile, and every review and reply they wrote follows. They can edit their own replies and mark other travelers' replies "Helpful". An unknown traveler's profile page answers with a real "not found" status. Their profile also shows the photo on each of their reviews, so visitors see what they saw.

Thread care round: deleting a reply that has answers leaves "This reply was deleted" in its place, so the conversation under it stays. Long threads fold away behind "Show more replies". A bell in the navbar tells a traveler when someone replies to their review or answers their reply.

Admin dashboard & moderation round (changed 2026-11-08, team request; it replaces the "moderation & photos round" and keeps all of it): the Lakat Iloilo team gets its own sign-in page and a glass admin dashboard — an overview, a Reports screen to keep, hide or delete reported reviews, and a Places screen to correct destination and accommodation details. A review reported by three different travelers hides itself until the team looks at it. A review can have up to four photos.

Full admin management round (2026-11-10): the Lakat Iloilo team can run the whole site from the dashboard. They add, edit and delete destinations and accommodations (every field, with the place's photo uploaded from their computer), search every review and reply and hide, show or delete them, and see who marked a review or reply Helpful and remove a like. Added 2026-11-10 (team request): the team can add new categories and kinds, the Reviews screen updates by itself, and every delete on the dashboard can be undone for a few seconds.

Photo credits round (2026-11-11, team request): every place photo the team adds or replaces on the dashboard carries its credits — the photographer, where it was published, a link to the original, its copyright licence and whether we are allowed to use it — so the owner of each photo is credited on the site and the team can see which photos still need their copyright checked.

Admin extras round (2026-11-12, team request; five features parked from the full admin management round, built as one round): the Places list updates by itself; the team can hide a reply instead of deleting it; categories and kinds can be renamed and given an icon and a card photo; a place can have up to six photos, each with its own credits; and whatever an admin deletes goes to a Trash for 30 days, where it can be restored after the 8-second Undo has passed.

Security hardening round (team request; from docs/LATER.md, parked after evaluations 2026-11-04 and 2026-11-05): the backend address is kept private on the server, and a Content-Security-Policy header is added. The browser no longer calls the NestJS backend directly; all backend calls go through Next.js API routes under /api/*, which forward requests to the backend. The backend address is stored in a server-side environment variable (API_URL), never exposed to the browser. A Content-Security-Policy header is added to control which resources the browser may load: it allows scripts and styles from the site's own domain, images from Supabase Storage and Wikimedia, and connections to Supabase for Realtime updates. The CSP is tested in report-only mode first to ensure it does not block Supabase live updates, review photos, or Next.js's own scripts, then enforced after verification.

## The user
Travelers planning weekend trips around Iloilo Province. No login required for browsing; an account is needed only to write a review.

**Second user (added 2026-11-08, team request): the Lakat Iloilo team.** A few team members whose accounts the team has added to the admins table by hand. They sign in on their own page and use the admin dashboard to moderate reviews and correct place details. Travelers never see the dashboard.

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
32. As a logged-in traveler, I want to change my display name and traveler type, so that my reviews and replies show who I am now.
33. As a logged-in traveler, I want to fix a typo in my reply and mark other travelers' replies helpful, so that conversations stay accurate and the best answers stand out.
34. As a traveler reading a thread, I want answers to stay when the reply above them is deleted, and long threads to fold away, so that conversations stay readable.
35. As a logged-in traveler, I want to be told when someone replies to my review or answers my reply, so that I can answer back.
36. As a traveler, I want a review that many travelers report to hide itself, and the Lakat Iloilo team to deal with reports, so that spam does not stay up.
37. As a logged-in traveler, I want to add up to four photos to my review, so that others see more of the place.
38. As any visitor, I want to see a traveler's review photos on their profile, so that I can judge their taste from what they saw, not only what they wrote.
39. As a member of the Lakat Iloilo team, I want my own sign-in and a clear, accessible dashboard with reports and place details, so that I can keep the site accurate and safe without using the Supabase dashboard.
40. As a member of the Lakat Iloilo team, I want to add, edit and delete destinations and accommodations, with a photo uploaded from my computer, so that the site stays complete without SQL.
41. As a member of the Lakat Iloilo team, I want to search every review and reply and hide, show or delete any of them, so that I can act before anyone reports it.
42. As a member of the Lakat Iloilo team, I want to see who marked a review or reply Helpful and remove a like, so that fake likes do not mislead travelers.
43. As a member of the Lakat Iloilo team, I want to add a new category or kind, so that a new sort of place does not need a code change.
44. As a member of the Lakat Iloilo team, I want the Reviews screen to update by itself and an Undo right after a delete, so that I work from what is true now and a wrong click is not final.
45. As a member of the Lakat Iloilo team, I want to record who took a place's photo, where it came from, its licence and whether we may use it, when I add or edit a place, so that every photographer is credited and no photo is used without permission.
46. As a traveler, I want to see who took a place's photo, so that the photographer gets the credit and I can find the original.
47. As a member of the Lakat Iloilo team, I want to hide a reply instead of deleting it, and rename a category or give it an icon and a card photo, so that I can moderate gently and keep the home page tidy without a code change.
48. As a traveler, I want to see several photos of a place, each with its photographer's credit, so that I know what to expect before I go.
49. As a member of the Lakat Iloilo team, I want a Trash where my deletes wait for 30 days, and a Places list that updates by itself, so that a wrong delete noticed later is not final and I always see the places as they are now.
50. As a developer, I want the backend address to stay private on the server, so that it is not exposed in browser network traffic.
51. As a developer, I want all backend calls to go through Next.js API routes, so that we have a single point of control for API access.
52. As a developer, I want a Content-Security-Policy header, so that the browser only loads scripts and resources from approved sources.
53. As a developer, I want the CSP to allow Supabase live updates, so that real-time features continue to work.
54. As a developer, I want the CSP to allow review photos from Supabase Storage, so that travelers can see uploaded images.
55. As a developer, I want the CSP to allow Next.js's own scripts and styles, so that the application functions correctly.
56. As a developer, I want the CSP to be testable, so that we can verify it does not block legitimate features.

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
   - **Deleting:** the traveler's own reply keeps its Delete button. When it has answers under it, the confirm step says "Delete this reply and its answers?", and the whole thread under it is deleted with it. (Changes in round 26: answers stay under "This reply was deleted".)
   - Unchanged: the replier's name (linking to their profile), traveler type tag and date; no editing replies (editing comes in round 25).

24. Live updates round — pages keep themselves up to date, with no reload:
   - **Home page:** when a destination or accommodation is added, changed or removed in Supabase, or a place's rating changes, the cards and star ratings update by themselves within a few seconds.
   - **Detail pages:** the place's details (name, photo, description, contact, address) update by themselves. If the place is removed, the page shows the existing "not found" message.
   - **Reviews on a detail page:** other travelers' new, edited and deleted reviews, star ratings, Helpful counts, replies and photos appear by themselves; the average rating at the top follows.
   - **Nothing is lost:** a review or reply being typed, an open Report pop-up, a delete confirm step and the scroll position stay as they are when an update arrives.
   - **Coming back:** after the phone sleeps, the tab sits in the background, or the connection drops, the page catches up by itself when it is back.
   - No new buttons or messages: updates arrive quietly. With "reduce motion" on, they just appear.

25. Profile & replies round — change your name, edit replies, Helpful on replies:
   - **Edit profile:** on their own profile, a logged-in traveler sees an **Edit profile** button. It opens a small form with the display name (2–40 characters) and "I'm traveling as" (the same three choices as sign-up), with Save and Cancel. After saving, "Your profile is updated." shows, and the new name and tag appear on the profile, in the navbar dropdown, and on every review and reply they have written. Nobody else sees the button.
   - **Edit a reply:** the traveler's own replies get **Edit** next to Delete. The same small form (up to 300 characters) opens in place of the reply's text, filled in, with Save and Cancel. An edited reply shows "· edited" after its date.
   - **Helpful on replies:** every reply gets a small glass **Helpful · 3** button, the same as on reviews: logged in, it turns amber when marked and back when clicked again; logged out, only the count shows; on the traveler's own reply, only the count.
   - **Unknown traveler:** the page looks the same as today ("We couldn't find this traveler" and Back to Home), but it now answers with a real 404 ("not found") status, so search engines and checking tools know it does not exist.
   - **Photos on the profile:** on a traveler's profile, a review with a photo shows it under the review's text, the same small picture as on the place page; clicking it opens it larger. A review without a photo looks the same as today. Everyone sees the photos, logged in or not, including on the traveler's own profile. (Added on 2026-11-06 at the team's request.)
   - **Change (2026-11-06, team request): no white box on hover or click, and less blur.** Hovering, clicking or arrow-key highlighting a dropdown item, search suggestion, option row or the unselected side of a pill switcher no longer paints a see-through white box behind it: the text changes colour instead (amber in menus and suggestions, brighter white in switchers), and bordered rows brighten their border. Buttons that already have a glass fill may still brighten it. Cards and tiles on the plain teal background, the navbar, the profile dropdown, the search suggestions and the phone menu no longer use a frosted-glass blur (it showed light stripes in some browsers); they use a plain glass fill or solid teal. Blur stays only over photos (the hero search box, category chips, the back link and the side panel on a place photo, the login card). Keyboard focus outlines are unchanged.

26. Thread care round — kinder deleting, folding threads, and a notifications bell:
   - **Deleting a reply with answers:** the reply stays in its place as "This reply was deleted" in grey, with no name, tag, text or buttons, and its answers stay under it. A reply with no answers disappears completely, as today. The confirm step says "Delete this reply?" in both cases. (Replaces round 23's "Delete this reply and its answers?")
   - **Folding long threads:** a reply with more than 3 answers shows the newest 3 and a **Show N more replies** link that opens the rest. Every reply with answers gets a **Hide replies** / **Show replies** link that folds and unfolds the thread under it. A new answer always opens its thread so the traveler sees it. **Change (2026-11-07, team request): threads start folded.** When the page loads, every reply with answers shows **Show replies** instead of its answers, so a review shows only its direct replies at first; opening one shows its answers, and each of their own threads stays folded until opened. The rest is unchanged.
   - **Notifications bell:** logged in, a bell sits beside the profile icon (in the phone menu, a "Notifications" line), with a small red dot and number when something is unread. Clicking it opens a glass list, newest first, up to 20: "Maria replied to your review of Bucari Little Baguio" or "Juan answered your reply on Hotel del Rio", with how long ago. Clicking one opens that place's page and marks it read; **Mark all as read** sits at the top. Empty: "No notifications yet." **Change (2026-11-07, team request): loading and length.** While the list loads for the first time it shows three grey placeholder rows (a skeleton) instead of "Loading…". It starts with the newest 6; with more, a **See previous notifications** link at the bottom shows the rest of the 20. The bell updates by itself within a few seconds, like the live updates round. (Notifications marked read on another device show as read when the traveler comes back to the tab or opens the bell; added 2026-11-07, code review.) In-app only: no emails. **Change (2026-11-07, team request):** clicking a notification opens the place page scrolled to that review (not just the top of the page), and the red number goes down at once, disappearing when nothing is unread. **Change (2026-11-07, team request): it opens the exact reply.** A notification about a reply or answer (or a Helpful mark on a reply) opens the threads around that reply, even past "Show N more replies", scrolls to it and makes it glow amber for a moment; a Helpful mark on a review does the same for the review. **Change (2026-11-07, team request): a lasting mark.** The reply a notification opened keeps an amber line, a soft amber background and a small "From your notification" label (with a bell) for as long as the page shows it, so it stays easy to find after the glow; a review opened by a Helpful notification gets an amber border, the same background and label. The answers under the reply are not tinted. Each kind has its own small icon in the list: a speech bubble for a reply to your review, an arrow for an answer to your reply, an amber thumbs-up for a Helpful mark.
   - Travelers are never notified about their own replies.
   - **Helpful likes notify too (added 2026-11-07, team request):** when another traveler marks your review or reply Helpful, the bell shows "Maria found your review of Bucari Little Baguio helpful" or "Juan found your reply on Hotel del Rio helpful". Never for your own. Removing the Helpful mark removes that notification, so marking on and off cannot flood the bell. They show whenever the traveler logs in, update live, and open the place at that review like the others.

27. Admin dashboard & moderation round — the Lakat Iloilo team's own sign-in and dashboard, auto-hide, and more photos (changed 2026-11-08, team request: replaces the "moderation & photos round", keeping all of it, in one round):
   - **Auto-hide:** when 3 different travelers have reported a review, it disappears from the place page, the ratings and the reviewer's public profile. Its writer still sees it on the place page with a grey note: "Hidden while the team reviews it."
   - **Who is an admin:** a team member whose account the team has added to the admins table by hand in the Supabase SQL Editor. The app can never make anyone an admin. A hidden address is not the protection: the backend refuses every admin request from anyone else, and Row Level Security refuses admin changes in the database.
   - **Admin sign-in (/admin/login):** not linked anywhere on the traveler site and hidden from search engines. A glass card over a darkened Iloilo photo: "Lakat Iloilo · Team", email, password, **Sign in**. An admin goes to the dashboard. Anyone else gets "This sign-in is for the Lakat Iloilo team." and is not logged in. Mistakes show plain messages, like the traveler login.
   - **Dashboard home (/admin):** a glass sidebar — Overview, Reports, Places, Back to the site, Log out (on phones a top bar with a menu). Four stat tiles: reviews this week, reports waiting (with how many reviews they are on), hidden reviews, places listed. Under them, the 5 newest reports, each opening the Reports screen. Change (2026-11-09, team request): the Overview updates live (Supabase Realtime on reviews, review_visibility_signals and report_signals, then the backend is asked again), without a reload.
   - **Reports (/admin/reports):** every review with at least one report, most reports first: the place, the reviewer's name, stars, text, photos, whether it is hidden, the number of reports, and each report's reason and note. Three buttons: **Keep it** (removes its reports and shows it again), **Hide it**, and **Delete review** (with a "Yes, delete" step). Also built (code review 2026-11-09): a "Check for new reports" button, and a newest report on the Overview opens Reports scrolled to that review.
   - **Places (/admin/places):** destinations and accommodations in one searchable list (name, type, category or kind, address), with All / Destinations / Accommodations buttons to narrow it (code review 2026-11-09). **Edit** opens a glass form with the name, description and address (and contact details for accommodations), Save and Cancel; saved changes show on the site at once. No adding or deleting places.
   - **Not an admin:** logged in or not, every /admin page except the sign-in shows the site's "not found" page, and every admin endpoint answers 401 without a login (or with an expired or fake one) and 403 "This page is for the Lakat Iloilo team." for a traveler's login Travelers see no admin links anywhere. **Change (2026-11-08, team request): a real 404.** The server checks before serving an admin page (a Next.js proxy, until Next.js 16 called middleware): the admin sign-in also keeps the admin's login in a cookie sent only to /admin pages, the proxy asks the backend whether it belongs to an admin, and anyone else gets the "not found" page with status 404, not 200. Change (2026-11-09, team report: slow admin pages): only full page loads are checked by the proxy (moving between dashboard pages and preloading fetch only page code, no data; the dashboard and every endpoint still check), and the backend remembers a genuine login check and the admin check for 30 seconds (never past the token's expiry). Trade-off, accepted: each running copy of the backend keeps its own memory, so after logging out another copy may accept that login for at most 30 seconds; the database's Row Level Security still checks every read and change. The proxy's shortcut for in-app navigation only applies with the admin cookie; without it, the answer is 404 as before.
   - **Design:** glassmorphism, built to be easy to use and accessible. Every admin page sits over a full-screen, darkened Iloilo photo, so the frosted-glass blur follows the no-white-hover rule (blur only over photos); panels are glass with clear borders, no white boxes on hover. Fraunces for headings and the site's body font for text, with generous spacing; amber accents like the rest of the site; text meets WCAG AA contrast; every control is a real button, link or labelled field with a visible keyboard focus; works at 375 px and on a laptop.
   - **Up to four photos:** the review form's "Add photos" takes up to 4 photos (each JPG, PNG or WebP, up to 2 MB), each with a preview and its own Remove button. Editing a review can add and remove photos. Under the review, the photos show as a row of small pictures; clicking one opens it larger, with next and previous buttons, arrow keys and Escape. Existing single photos show as before. A traveler's profile shows a review's photos as the same row of small pictures.
28. Full admin management round — the team runs places, reviews, replies and likes from the dashboard (2026-11-10; one round, tickets from 116). Travelers see nothing new:
   - **Places: add a place.** On /admin/places, **Add a place** opens the same glass form as Edit, empty: Destination or Accommodation, name, description, address, category (destination) or kind (accommodation), Iloilo City or Iloilo Province, latitude and longitude, a photo, and phone and email for accommodations. Saving shows the place on the site at once.
   - **Places: the photo is a file upload (team request 2026-11-10).** "Choose a photo" opens the computer's file chooser: one JPG, PNG or WebP up to 2 MB, with a preview before saving and a plain message for a wrong file. No photo web address is typed anywhere. A new place needs a photo; editing can replace it. Places that already have a photo keep it until it is replaced.
   - **Places: edit every field.** The Edit form gains the category or kind, the location, the latitude and longitude, and the photo.
   - **Places: delete a place.** **Delete** on each row of the Places list, next to Edit, opens a confirmation pop-up that says how many reviews go with it ("Its 5 reviews will be deleted too."), with **Cancel** and **Yes, delete**. **Change (2026-11-10, team request):** it was a step at the bottom of the Edit form, which needed scrolling; the Edit form now has no Delete. **Change (2026-11-13, ticket 148):** the place now goes to the Trash with its reviews, and the pop-up says so; it is deleted for good only from the Trash (ticket 149).
   - **Reviews (/admin/reviews, new in the sidebar):** every review, newest first, 50 at a time with "Show more". A search box (review text, reviewer's name or place) and All / Hidden / Reported buttons. Each review shows the place, the reviewer, stars, text, photos, its Helpful count and Visible or Hidden. Buttons: **Hide it** or **Show it**, and **Delete review** (with "Yes, delete").
   - **Replies:** "Replies (N)" under a review on that screen (next to "N Helpful"; **change 2026-11-11, team request:** was "Show replies (N)" on its own row) opens its replies, each with **Delete reply** (with "Yes, delete"). A reply that has answers leaves "This reply was deleted", exactly as when its writer deletes it. **Change (2026-11-13, ticket 148):** Delete reply now sends it to the Trash; travelers see "This reply was deleted" in its place while it waits (one with no answers leaves the thread), and Restore puts it back.
   - **Helpful likes:** a review's or reply's "N Helpful" on that screen opens the list of travelers who marked it (display names only, never emails), each with **Remove**. Removing a like lowers the count on the site at once and removes its notification.
   - **Categories and kinds (added 2026-11-10, team request):** on /admin/categories ("Categories" in the sidebar; **change 2026-11-11, team request:** it was a panel at the bottom of /admin/places), a "Categories and kinds" screen lists the destination categories and the accommodation kinds, each with how many places use it. **Add** takes a name (2 to 30 characters, not already used). **Delete** works only while no place uses it. The place form's Category or Kind list is filled from these. On the home page, a new category or kind gets its chip, its card and its list like the existing ones, with a general icon and the photo of its first place; one with no places yet is not shown. The eight existing ones keep their icons and photos.
   - **The Reviews screen is live (added 2026-11-10, team request):** when a traveler posts, edits or deletes a review, a review is hidden or shown, reports arrive, or replies, likes or photos change, the list, counts and badges update by themselves within a few seconds (Supabase Realtime as the doorbell, then the backend is asked again). What the admin is doing is kept: the search text, the chosen filter, open replies, an open likes list and a "Yes, delete" step. The Reports screen is live in the same way.
   - **Undo after a delete (added 2026-11-10, team request):** after "Yes, delete" on a review, a reply or a place, and after Remove on a like, the item leaves the list at once and a line says, for example, "Review deleted. **Undo**" for 8 seconds. Undo puts it back and nothing was deleted. When the time runs out, or the admin leaves the page, the delete is really made, and then it cannot be brought back. **Change (2026-11-13, tickets 147 and 148):** for a review, a reply or a place, the delete now sends it to the Trash, where it can be restored for 30 days; a Helpful like removed is still final. Travelers keep seeing the item until the delete is really made. Leaving the page includes opening another dashboard page, logging out, reloading and closing the tab (sent so the browser finishes it). Applies to Delete review on the Reports screen too (ticket 127).
   - **Pages and sorting (added 2026-11-11, team request; tickets 129–131):** Places, Reviews and Reports show their list in numbered pages. At the top: **Sort** with three choices, each with its icon — ⏱ **Recently added**, ✦ **Most relevant**, ★ **Top-rated** — and **Show 10 / 25 / 50** per page (10 at first). At the bottom: "Showing 11–20 of 168" and ‹ Previous · 1 2 3 … 17 · Next ›. Changing the sort, the number per page, the search or a filter goes back to page 1. What the choices mean:
     - Places: Recently added = newest place first; Most relevant = most reviews first; Top-rated = highest average stars first (places with no reviews last).
     - Reviews: Recently added = newest first; Most relevant = most Helpful marks plus replies first; Top-rated = most stars first, then newest. (Replaces "Show more".)
     - Reports: Recently added = newest report first; Most relevant = most reports first; Top-rated = most stars first.
     Ties are broken by newest first, then by name, so the order never jumps between pages. The live updates (Reviews, Reports) keep the page, sort and number per page.
   - The new screens follow the dashboard's rules (**change 2026-11-11, team request:** no blur, big shadow or dark tint on cards, because they showed black patches on hover and click; a card's outline only for the keyboard): glass panels, keyboard use, WCAG AA contrast, 375 px to laptop, one skeleton then the content, and "not found" (404) for anyone who is not an admin.
29. Photo credits round — every place photo carries its credits (2026-11-11, team request; one round, tickets from 132):
   - **Place form, Add and Edit (/admin/places/new and Edit):** a "Photo credits and copyright" box right below the photo upload, for destinations and accommodations alike. Fields: **Photographer** (required; a name or username), **Publisher / website** (optional, e.g. "Wikimedia Commons"), **Original photo URL** (optional, must start with https://), **Copyright licence** (required; CC BY 4.0, CC BY-SA 4.0, CC0 / Public domain, All rights reserved, Our team's own photo, Other), **Authorization status** (required; Allowed by its licence, Permission from the owner, Our team's own photo, Not checked yet) and **Attribution / photo credits** (required; the line shown on the site; it fills itself in from the fields, e.g. "Photo: Riyan0721 / Wikimedia Commons, CC BY-SA 4.0", and the admin can change it). Copyright check: a photo marked "All rights reserved" is saved only with "Permission from the owner", and a new place needs the three required fields before "Add place" works. When a new photo is chosen or was uploaded, the credits stay and the box says "Check these credits: the photo was changed." until they are saved again.
   - **Places list (/admin/places):** a place with no credits yet, or marked "Not checked yet", shows an amber "Credit missing" label under its name; typing "credit" in Find a place lists just those.
   - **Place pages (traveler side):** a small credit line under the photo, e.g. "Photo: Riyan0721 / Wikimedia Commons, CC BY-SA 4.0", linking to the original photo when there is a URL. The authorization status is never shown to travelers.
   - **Splash art until the photo is allowed (added 2026-11-11, team request; ticket 138):** travelers see a place's own photo only once its credits are saved with a status other than "Not checked yet". Until then — places with no credits too — the home page cards, Featured / Trending and the place page show the Lakat Iloilo splash art (the team's 1920 × 1080 art on every screen; **change 2026-11-12, code review:** the WebP copy of that art, splash-desktop-1920x1080.webp, about 250 KB instead of the 2.2 MB PNG; **change 2026-11-11, team request:** the place pages briefly used phone and tablet sizes and are back to the wide one; **change 2026-11-11, team request: "restore it to the original similar to the credited photo":** on a place page the splash art fills exactly the photo area a credited photo uses, at every width, with the chips, name and address on it; it is kept to its top edge so the art's own title is not cut), and no credit line. The photo stays uploaded and the dashboard still shows it; saving allowed credits shows it on the site. The credits box on Add and Edit says so.
   - **Photo credits page (/credits):** also lists the credits saved on the dashboard (place name, credit line, licence, link), next to the existing Wikimedia list.

30. Admin extras round — five parked features in one round (2026-11-12, team request; tickets from 139). The team chose one round over three; it is about 15 tickets, more than one three-hour session, and the tickets stay in three groups so each can be checked on its own:
   - **Group A — dashboard extras.**
     - **Places (/admin/places) updates by itself:** a place added, edited or deleted, or a review that changes a place's count or stars, shows within a few seconds without a reload, like Reviews and Reports; the search, filter, sort and page are kept.
     - **Hide a reply (Reviews → replies):** beside Delete, **Hide it / Show it**, with the same 8-second Undo. Travelers see "This reply was hidden by the Lakat Iloilo team." in its place, and answers under it stay (like a deleted reply). The writer still sees their own text, marked "Hidden by the Lakat Iloilo team", as with hidden reviews.
     - **Edit a category or kind (/admin/categories):** **Edit** on each one changes its name (2 to 30 characters, not already used), its icon (one of about 16, for example mountain, utensils, landmark, tent, waves, building) and its card photo (one of its own places' photos, or "the first place's photo", as today). No upload, so the photo always has its credits; a photo that is not allowed shows the splash art. The eight built-in ones become editable too, starting with their current icons and photos.
   - **Group B — more photos per place.**
     - **Place form (Add and Edit):** up to 6 photos per place, each with its own "Photo credits and copyright" box; the admin makes one the **cover** (the cards use it), moves photos earlier or later with arrow buttons, and deletes any.
     - **Place page:** the cover across the top as today, and a row of the other allowed photos. **Change (2026-11-13, team request):** they show as a mosaic (the first photo large, the others as tiles, no gaps for 1 to 5 photos), each tile with the photographer's credit on a soft fade and an enlarge mark, under a "Photos" heading with a count pill and a one-line hint; clicking one opens its own full-screen viewer (not the reviews' one): the photo at the size it was uploaded, only made smaller to fit the screen; Previous and Next fixed at the middle of the screen's left and right edges, the photo kept clear of them; no going round (the first photo has no Previous arrow and the last no Next; the arrow keys follow the same rule); the photo's credit line and "2 of 4" at the bottom of the screen.
     - **Splash rule, per photo:** a photo whose credits are not allowed is left out; with no allowed photo, the splash art shows, as today. "Credit missing" on /admin/places shows while any photo of the place lacks allowed credits.
   - **Group C — Trash.**
     - **Trash (/admin/trash, "Trash" in the sidebar):** every review, reply and place an admin deleted, newest first, each with what it was, when, and by which admin, and two buttons: **Restore** (it comes back as it was, with its replies, Helpful likes, photos, reports and credits) and **Delete for good** (after a pop-up).
     - Items stay 30 days, then are deleted for good (when an admin opens Trash; no scheduled job). The 8-second Undo stays: the Trash is the second chance after it.

31. Security hardening round — backend address private and Content-Security-Policy header (from docs/LATER.md, parked after evaluations 2026-11-04 and 2026-11-05):
   - **Backend address private:** the browser no longer calls the NestJS backend directly. All backend calls go through Next.js API routes under /api/*, which forward requests to the backend. The backend address is stored in a server-side environment variable (API_URL), never exposed to the browser. The frontend's src/lib/api.ts is updated to call /api/* instead of the backend address directly. Travelers see no change; all features work as before.
   - **Content-Security-Policy header:** a CSP header is added to control which resources the browser may load. The policy allows scripts and styles from the site's own domain, images from Supabase Storage (for review and place photos) and Wikimedia Commons (for initial data), and connections to Supabase for Realtime updates. The CSP is tested in report-only mode first to ensure it does not block Supabase live updates, review photos, or Next.js's own scripts, then enforced after verification. The policy is:
     ```
     Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://<our project>.supabase.co https://upload.wikimedia.org https://thumb.wikimedia.org https://images.unsplash.com; font-src 'self'; connect-src 'self' https://<our project>.supabase.co wss://<our project>.supabase.co; frame-src 'none'; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'
     ```
     Set in `src/proxy.ts`; `'unsafe-eval'` is added to script-src in development only (`npm run dev` needs it). **Change (2026-11-19, team request):** added blob: (photo previews), thumb.wikimedia.org and images.unsplash.com (the home page's photos), wss://*.supabase.co (Realtime's WebSocket), frame-ancestors and object-src 'none' (tickets 154). **Change (2026-11-20, team request after code review):** the policy is enforced (ticket 156), and Supabase is only our own project, read from NEXT_PUBLIC_SUPABASE_URL, not every *.supabase.co site. The backend's CORS is off unless CORS_ORIGIN is set: no browser calls the backend since ticket 152. The proxy waits up to 60 seconds, like photo uploads.
   - **No new screens or features:** all existing screens (home, detail pages, login, admin dashboard) work exactly as before. The changes are internal to the application's architecture and security headers.

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

Row Level Security policy for review_replies: anyone may read. Only a logged-in traveler may add a reply, and only with their own user_id. Only the traveler who wrote a reply may delete it. No one may edit a reply. (From the profile & replies round, the writer may edit its text; see below.)

**review_replies table, threaded replies round:** gains parent_reply_id — the reply being answered, or empty when the reply answers the review itself. The database refuses a parent reply that is under a different review. Deleting a reply deletes every answer under it (all levels), the same way deleting a review deletes its replies (until the thread care round, which keeps the answers; see below). Travelers may now send review_id, parent_reply_id and the text; everything else is still filled in by the database. The Row Level Security policy is unchanged.

**review_reports table (review extras round):**
- id — unique identifier for each report
- review_id — the reported review; reports are removed when the review is deleted
- user_id — the traveler who reported it (from Supabase Auth)
- reason — one of: "spam", "offensive", "not_about_place", "other"
- note — optional, up to 300 characters
- created_at — timestamp
- One report per traveler per review (review_id and user_id together are unique).

Row Level Security policy for review_reports: no one may read reports through the app; the team reads them in the Supabase dashboard. Only a logged-in traveler may add a report, only with their own user_id, and never on their own review. No one may edit or delete a report through the app. (From the moderation & photos round, admins may read and delete reports; see below.)

**Live updates round:** no new table or column. One SQL file adds destinations, accommodations, reviews, review_likes and review_replies to Supabase's Realtime list (the supabase_realtime publication), so Supabase can announce changes to them. Row Level Security is unchanged and still decides: Realtime only tells a viewer about rows they may already read, and all five are already readable by anyone. review_reports stays off the list (nobody may read reports through the app). The browser uses Realtime only as a signal that a table changed; it never uses the rows Realtime sends.

**reviews table, review extras round:** gains photo_path — where the review's photo is kept in Storage, or empty when there is no photo. Like the stars and comment, only the review's writer may set or clear it. (Replaced by the review_photos table in the moderation & photos round; see below.)

**review-photos Storage bucket (review extras round):** anyone may view the photos. A logged-in traveler may upload only into a folder named after their own user_id, and only that traveler may replace or delete files there. Photos are JPG, PNG or WebP, up to 2 MB, so an upload stays under Vercel's 4.5 MB request limit. Uploads go through the backend as the logged-in traveler, so these Storage policies decide, like Row Level Security does for the tables.

Likes on TypeORM round: no database change, no new SQL, and nothing to run in Supabase; the review_likes columns and Row Level Security policies stay as in the profiles & likes round. The backend describes review_likes to TypeORM with its three columns (review_id and user_id, which together identify a like, and created_at), linked to the review it belongs to. The backend still sends only review_id: user_id and created_at are still filled in by the database from the login, and TypeORM is told never to send them (the database only lets travelers set review_id). Marking and unmarking still run as the logged-in traveler inside one transaction, so Row Level Security still decides, including refusing a like on your own review. Helpful counts and "liked by me" on reviews and profiles are read through TypeORM, with the same answers as before.

(Before the backend round, the browser read and wrote reviews directly through Supabase with the same keys and the same Row Level Security policy.)

The traveler type is saved on the Supabase Auth account, next to the display name. The database copies it onto each review, the same way it copies reviewer_name, so it can never be typed in from the browser. The reviews Row Level Security policy is unchanged.

**Profile & replies round:**
- **Display name and traveler type** stay on the Supabase Auth account. The backend changes them with the traveler's own login and the publishable key, never the service_role key. A database trigger on the account (security definer, like the existing name-copying triggers) then copies the new name and type onto every reviews and review_replies row with that user_id, without changing their "last edited" time. The browser can still never type a name onto any row.
- **review_replies** gains **updated_at** — when the reply's text was last edited, or empty if never. New Row Level Security policy: only the reply's writer may edit it, and only its comment (1–300 characters); review_id, parent_reply_id, user_id, the name and type cannot change.
- **reply_likes table (new):** reply_id (removed with the reply), user_id (from Supabase Auth), created_at. One like per traveler per reply (reply_id and user_id together are unique). Row Level Security: anyone may read. Only a logged-in traveler may add a like, only with their own user_id, and never on their own reply. Only that traveler may remove their like. No one may edit a like. Added to the Realtime list like review_likes.
- **Short names (added 2026-11-06, code review):** the database uses "Traveler" on reviews and replies for any display name under 2 characters, as it already did for an empty one, so a name changed outside the website still follows the 2–40 rule. One shared name rule is used by every trigger that copies a name.
- **Photos on the profile (added 2026-11-06):** no table or Storage changes. Review photos are already public (the review-photos bucket, review extras round); the profile only reads them. Row Level Security is unchanged.

**Thread care round:**
- **review_replies** gains **deleted_at** — when its writer deleted it, or empty. Deleting a reply that has answers does not remove the row: the database clears its comment, replier_name and traveler_type (and, since 2026-11-07, its user_id, so its writer cannot be looked up through Supabase's public data API either), removes its Helpful likes and sets deleted_at, and its answers stay. Deleting a reply with no answers removes the row, as today; when the last answer under a deleted reply goes, the deleted reply goes too. Only the reply's writer may do either. A deleted reply cannot be edited, liked or answered.
- **notifications table (new):**
  - id — unique identifier
  - user_id — the traveler the notification is for
  - kind — one of: "review_reply" (someone replied to your review), "reply_answer" (someone answered your reply), and since 2026-11-07 "review_like" (someone marked your review Helpful) and "reply_like" (someone marked your reply Helpful)
  - review_id — the review the conversation is under (the notification is removed with it)
  - reply_id — the new reply, or the reply that was liked (removed with it); empty for "review_like"
  - actor_id — who replied or liked (added 2026-11-07), so removing a Helpful mark can remove its notification
  - actor_name — the replier's display name, copied by the database; since 2026-11-07 it follows the replier's or liker's later name changes, like their reviews and replies
  - read_at — when it was read, or empty
  - created_at — timestamp
- Notifications are created only by the database, by a trigger when a reply is added (and, since 2026-11-07, when a Helpful like is added on a review or reply), and never for the traveler's own reply, review or like. Removing a Helpful like removes its notification. Row Level Security: a traveler may read only their own notifications, and may change only read_at on their own. No one may add or delete notifications through the app. Added to the Realtime list, where Row Level Security means each traveler only hears about their own. **Change (2026-11-07, ticket 104 fix): the bell does not listen to this table.** Listening to it needs the Realtime connection to carry the traveler's login, and Supabase never registered that connection. Every notification is made or removed in the same moment as a reply or a Helpful mark, so the bell listens to review_replies, review_likes and reply_likes (public tables, like the place pages) and then asks the backend, which only answers the traveler's own notifications. The table stays on the list, with Row Level Security, but nothing listens to it.

**Admin dashboard & moderation round** (was "moderation & photos round"; changed 2026-11-08):
- **admins table (new):** user_id — an account that may sign in to the admin dashboard. The team adds and removes rows by hand in the Supabase SQL Editor; the app can never change it. Row Level Security: a traveler may read only their own row (so the app can ask "am I an admin?"); no one may write through the app.
- **reviews** gains **hidden_at** — when the review was hidden, or empty. A database trigger sets it when a review reaches 3 reports (it runs as security definer, because travelers cannot read reports). The reviews read policy changes to: anyone may read reviews whose hidden_at is empty; the writer and admins may read all. Hidden reviews do not count toward a place's average rating or review count, and are left off public profiles. Only admins may set or clear hidden_at; the writer cannot unhide their own review.
- **reviews**, admins: admins may also delete any review (its replies, likes, reports, photos and notifications go with it, as today).
- **review_visibility_signals** (ticket 109, change 2026-11-08): a tiny read-only table on the Realtime list. A trigger adds a row (place_type, place_id, created_at; never the review) whenever a review is hidden or shown again, so open place pages and the home page hear about it, because Realtime cannot announce a row the viewer may no longer read. Anyone may read it; nobody may write through the app; rows older than a day are cleared.
- **report_signals** (team request 2026-11-09, supabase/sql/045): a tiny read-only table on the Realtime list. A trigger adds one row (only a time; never the review, place, reason, note or reporter) whenever reports are added or removed, so the admin Overview updates live without putting review_reports on the Realtime list. Anyone may read it; nobody may write through the app; rows older than a day are cleared.
- **review_reports:** admins may now read and delete reports ("Keep it" deletes them). They may read the reason, note, review and date, but never who reported it (ticket 108, supabase/sql/039). Everyone else still cannot read them, and review_reports stays off the Realtime list.
- **destinations and accommodations**, admins (added 2026-11-08): admins may change only the name, description and address (and, for accommodations, the contact details); every other column stays out of reach. Anyone may still read. No one may add or delete places through the app.
- **review_photos table (new):** id, review_id (removed with the review), photo_path (where it is kept in Storage), position (1 to 4), created_at. At most 4 per review. Row Level Security: anyone may read photos of reviews they may read; only the review's writer may add or remove them. It replaces reviews.photo_path: the round's SQL (044) copies every existing photo into it as position 1. Change (2026-11-09): the old column is dropped only after the push, by a later file that first copies any photo added in between, because the live site uses it until then. Added to the Realtime list.
- **review-photos Storage bucket:** unchanged for travelers (their own folder only, JPG, PNG or WebP, up to 2 MB). Admins may also delete files, so deleting a review removes its photos. Each photo is sent in its own request, because four 2 MB photos would go over Vercel's 4.5 MB request limit.
- Nothing in these rounds uses the service_role key or any sb_secret_ key: admin rights come from the admins table and Row Level Security.

PostGIS extension: Enabled on Supabase database. The `location` column stores geography points for spatial queries (e.g., find destinations within X km of a point).

**Full admin management round (2026-11-10):** one new table (place_categories, added 2026-11-10) and a new Storage bucket. Every new permission asks is_admin(), and Row Level Security stays on everywhere.
- **destinations and accommodations:** admins may now also add and delete places (a new place must have a photo and a description, 050), and change the category or kind, location (Iloilo City or Province), latitude, longitude and photo. Everyone may still read; travelers still cannot write. The database checks: the category or kind is one from the place_categories table (below); the latitude and longitude are inside Iloilo; a trigger keeps the map position (location) in step with them. Deleting a place deletes its reviews, with their replies, likes, reports, photos and notifications.
- **place-photos Storage bucket (new):** anyone may view the photos. Only admins may add, replace or delete files; JPG, PNG or WebP, up to 2 MB (the bucket refuses anything else). A place's photo_url holds the uploaded photo's public address; older places keep their existing address until the photo is replaced. Replacing a photo or deleting the place deletes the old uploaded file.
- **reviews:** no rule changes: admins may already hide, show and delete any review (040). "Show it" clears hidden_at and keeps the reports.
- **review_replies:** admins may delete any reply, through a database function that follows the same "This reply was deleted" rule as the writer's own delete (034).
- **review_likes and reply_likes:** admins may delete any like; everyone else still only their own.
- **Who marked it Helpful:** a database function, for admins only, answers the display names (and account ids) of the travelers who liked one review or reply. Never emails.
- **place_categories table (new, added 2026-11-10):** id (a short word made from the name, for example "beach"), name (as shown, 2 to 30 characters), applies_to ("destination" for categories, "accommodation" for kinds), created_at. It starts with the eight in use today: festival, food, heritage, mountain, nature, walking (destinations) and hotel, condominium (accommodations). Row Level Security: anyone may read; only admins may add and delete; nobody may edit one. A trigger refuses deleting one that a place still uses, and refuses a place whose category or kind is not in the table (or is of the other sort). Added to the Realtime list, so the home page notices a new one.
- **Undo:** no database change. The dashboard waits 8 seconds before asking the backend to delete, so until then nothing has changed in the database.
- **Live Reviews screen:** no database change. It listens to tables already on the Realtime list (reviews, review_replies, review_likes, reply_likes, review_photos, review_visibility_signals and report_signals); review_reports itself stays off the list.

**Photo credits round (2026-11-11):** one new table. Row Level Security on, every write asks is_admin().
- **place_photo_credits table (new):** place_type ("destination" or "accommodation") and place_id (which place; one row per place), photographer (1 to 100 characters), publisher (up to 100, empty for none), source_url (the original photo, https only, empty for none), licence (one of: cc_by_4, cc_by_sa_4, cc0, all_rights_reserved, own_photo, other), authorization_status (one of: licence_allows, owner_permission, own_photo, not_checked), credit_line (1 to 200 characters), updated_at, updated_by (the admin who saved it). The database refuses all_rights_reserved unless the status is owner_permission. Row Level Security: only admins and the backend's own login may read (**change 2026-11-11, code review:** 054 let anyone read every column, including the status and the saving admin's account id; 055 limits it); travelers get the credit line, licence and link through the backend; only admins may add, change or delete. Deleting a place deletes its credits (a trigger, like its reviews). The traveler-facing endpoints send only the credit line, licence and link, never the status.

**Admin extras round (2026-11-12):** one table changes shape, two are new, two get new columns. Row Level Security stays on everywhere, and every write asks is_admin().
- **review_replies:** new hidden_at (when an admin hid it, empty otherwise). Only admins may set or clear it. Public answers carry "This reply was hidden by the Lakat Iloilo team." instead of the text, except to its writer.
- **place_categories:** new icon (one of the icon names) and photo_place_id (the place whose photo the card uses, or empty for the first place). Anyone may read them; only admins may change name, icon and photo_place_id (the database still checks the name's length and that it is not used twice).
- **place_photos table (new):** id, place_type and place_id (the place), the photo's address, position (1 to 6; 1 is the cover), created_at. Anyone may read the rows of allowed photos (through the backend); only admins may add, move or delete them. Deleting a place deletes its photos. Today's photo of each place becomes its photo 1.
- **place_photo_credits:** one row per photo (photo_id) instead of per place; today's credits move to each place's photo 1. The rules from 054 and 055 stay: only admins and the backend read it, only admins write.
- **Trash (change 2026-11-13, ticket 147, for the team to confirm):** no separate trash table with copies. Re-inserting copied rows would run the database's own "new row" rules again (a restored reply would become the admin's, notifications would be sent again). Instead a deleted review gets **trashed_at** and **trashed_by** (supabase/sql/060), and nothing is copied or removed: every rule that lets anyone read reviews (the public, the backend, the writer, and admins too) leaves trashed ones out, so every page and screen leaves them out with no other change; only the Trash, through admin-only functions, sees them. Restore clears trashed_at, so everything comes back exactly as it was. One review per traveler per place now counts only reviews not in the Trash; restoring one whose writer has written a new review of that place is refused. Expiry: 30 days after trashed_at. The team agreed to this design on 2026-11-13 (ticket 147 ticked). Delete for good in 149.
- **Trash for replies and places (ticket 148, supabase/sql/061):** the same way.
  - A reply in the Trash stays in its thread as "This reply was deleted" (one with no answers under it leaves the thread), so the answers under it stay; its text, name, tag and writer wait in **trashed_reply_texts** (admins only). Its Helpful likes are kept and come back with it; its notifications are removed and do not come back. While it waits it cannot be edited, liked, answered, hidden or shown. Restore is refused, with a plain message, while its review is in the Trash.
  - A place in the Trash gets trashed_at and trashed_by: the read rules leave it out for everyone (home, search, map, credits page, every dashboard screen) and admins cannot edit it. Its reviews not already in the Trash go with it (**trashed_with_place**); they are not listed on their own, the place stands for them. Nobody can write a review of it. Its photos, credits and files stay. Restore brings it back with those reviews; a review that was in the Trash on its own stays there. A review whose place is in the Trash can be restored only after the place.
  - A category whose only places are in the Trash still counts them, so it cannot be deleted until they are deleted for good (ticket 149).
- **Delete for good and 30 days (ticket 149, supabase/sql/062):** only for an item in the Trash, after a pop-up (no Undo). A review goes with its replies, likes, reports and photos; a reply follows the rule from before the Trash (with answers it stays for good as "This reply was deleted", without it is removed); a place goes with every review of it, its photos and credits. The database answers the photo files and the backend deletes them from Storage as the admin. Opening the Trash first deletes for good everything that went there more than 30 days ago (no scheduled job).
- **Code review (2026-11-15):** the Overview's "Reports waiting" and "Reported reviews" leave out reports on reviews in the Trash, and the Reviews screen's "Replies (N)" and its Most relevant sort leave out replies in the Trash, so each number matches what the screen shows. The Trash's endpoints moved to their own controller (same addresses, admins only). admin_delete_reply (052) is dropped, unused since ticket 148 (supabase/sql/063).

**Security hardening round (from docs/LATER.md, parked after evaluations 2026-11-04 and 2026-11-05):** no database changes. The same Supabase tables and Row Level Security policies remain unchanged. No new tables, columns, or policies. The backend address is moved from the client-side NEXT_PUBLIC_API_URL environment variable to a server-side API_URL environment variable, and all backend calls go through Next.js API routes. The Content-Security-Policy header is added at the Next.js application level (in src/proxy.ts), not in the database.

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

**Profile & replies round (v1):**
- PATCH /v1/auth/me — logged-in traveler; changes their own display name (2–40 characters) and traveler type, and answers the same as GET /v1/auth/me (400 outside the limits, 401 not logged in)
- PATCH /v1/replies/:id — logged-in traveler; edits the text of their own reply (1–300 characters) and answers with it (404 "We couldn't find that reply among yours.", 400 outside the limits)
- POST /v1/replies/:id/like and DELETE /v1/replies/:id/like — logged-in traveler; marks or unmarks a reply helpful and answers { helpful_count, liked } (400 "You can't mark your own reply as helpful.", 404 no such reply)
- GET /v1/reviews — each reply also carries helpful_count, liked_by_me (with a login) and updated_at
- GET /v1/travelers/:id — the website's profile page now answers 404 when this answers 404; each review also carries its photo's address (photo_url, or empty when there is no photo; added 2026-11-06)

**Thread care round (v1):**
- DELETE /v1/replies/:id — a reply with answers becomes "This reply was deleted" instead of taking its answers with it; same answer and messages as before
- GET /v1/reviews — each reply also carries deleted (true or false); a deleted reply has no name, tag, text or Helpful count
- GET /v1/notifications — logged-in traveler; their own 20 newest notifications (kind, actor_name, the place's type, id and name, review_id, reply_id, read, created_at) and unread_count (401 not logged in)
- POST /v1/notifications/read — logged-in traveler; marks one of their notifications read ({ id }), or all of them with no id; answers { unread_count } (400 for an id that is not an id, 401 not logged in; someone else's id changes nothing)

**Admin dashboard & moderation round (v1)** (was "moderation & photos round"; changed 2026-11-08):
- POST /v1/admin/login — anyone; { email, password }. Signs in like POST /v1/auth/login, then checks the admins table: an admin gets the same answer as a traveler login; anyone else gets 403 "This sign-in is for the Lakat Iloilo team." and the login is ended at once; a wrong email or password answers the same way as the traveler login
- GET /v1/auth/me — also answers is_admin
- GET /v1/admin/me — admins only; the signed-in admin's own details, the same as GET /v1/auth/me (added 2026-11-08, ticket 107)
- GET /v1/admin/overview — admins only; { reviews_this_week (last 7 days, hidden included), reports_waiting, reported_reviews (how many reviews those reports are on), hidden_reviews, places, newest_reports (5: reason, note, date, place and reviewer name; never who reported) }
- GET /v1/admin/reports — admins only; up to 100 reported reviews, most reports first, each with its reports (reason, note, date; never who reported) (403 "This page is for the Lakat Iloilo team." for anyone else)
- POST /v1/admin/reviews/:id/keep — admins only; deletes the review's reports and shows it again
- POST /v1/admin/reviews/:id/hide — admins only; hides the review
- DELETE /v1/admin/reviews/:id — admins only; deletes the review and its photos
- GET /v1/admin/places — admins only; every destination and accommodation (id, type, name, category or kind, address)
- GET /v1/admin/places/:type/:id — admins only; one place with the fields the Edit form changes
- PATCH /v1/admin/places/:type/:id — admins only; changes the name (1–100), description (1–1000) and address (1–200) (and phone ≤ 40 / email ≤ 120, empty for none, for accommodations), and answers with the saved place (400 with a plain sentence for an empty or too long field, 404 no such place; ticket 112, supabase/sql/043)
- POST /v1/reviews/:id/photos — the review's writer; adds one photo (JPG, PNG or WebP, up to 2 MB) and answers { id, url, position } (400 "A review can have up to 4 photos.", 400 for a wrong file as today)
- DELETE /v1/reviews/:id/photos/:photoId — the review's writer; removes that photo from the review and from Storage
- POST /v1/reviews and PATCH /v1/reviews/:id — no longer take a photo: the website saves the review first, then sends each new photo on its own
- GET /v1/reviews — each review carries photos (a list of { id, url, position }) instead of photo_url, and hidden: true on a hidden review shown to its writer (ticket 109; admins see hidden reviews on the Reports screen, not on the place page); hidden reviews are left out for everyone else. GET /v1/ratings and GET /v1/travelers/:id leave hidden reviews out

All writes in these rounds run as the logged-in traveler (the asTraveler step), so Row Level Security and the Storage policies decide. Admin endpoints run the same way, as the logged-in admin, so the database checks the admins table on every change, not only the backend. Every admin endpoint except POST /v1/admin/login first goes through one backend check (a NestJS middleware, added 2026-11-08 at the team's request): 401 without a valid login, 403 "This page is for the Lakat Iloilo team." for anyone who is not in the admins table. The backend never uses the service_role key.

**Likes on TypeORM round (v1):** no endpoint changes. POST and DELETE /v1/reviews/:id/like, GET /v1/reviews and GET /v1/travelers/:id keep the same inputs, answers and refusal messages.

**Version 2 (/v2):**
- Reserved for future API changes. v1 remains available to prevent breaking existing clients.

**CORS:** Configured to allow requests from the Next.js frontend domain. From the backend round it also accepts adding, editing and deleting (not only reading), still only from the site's own addresses.

**Full admin management round (2026-11-10), admins only (401 logged out, 403 for a traveler):**
- POST /v1/admin/places/:type — adds a destination or accommodation: the fields as form data plus one file "photo" (JPG, PNG or WebP, up to 2 MB); answers 201 with the saved place (400 with a plain sentence for a missing or wrong field or photo; nothing is saved then). The backend chooses the id, uploads the photo, then adds the place; if adding fails, the photo is deleted again (ticket 120, supabase/sql/050). The form is at /admin/places/new. After adding, the page shows the new place as a showcase card: the photo large with the name, its kind and location on it and a "Live on the site" badge, then the address, the start of the description and three "What's next" tiles (View the place page, Edit it, Add another place) (team request 2026-11-11).
- PATCH /v1/admin/places/:type/:id — now changes every field (category or kind, location, latitude and longitude too; ticket 118)
- POST /v1/admin/places/:type/:id/photo — one file "photo" (JPG, PNG or WebP, up to 2 MB) that replaces the place's photo; answers the saved place (400 "Please choose a JPG, PNG or WebP photo up to 2 MB.", 404 no such place). Its own request, so a photo never rides along with the other fields (ticket 119)
- DELETE /v1/admin/places/:type/:id — deletes the place, its reviews and its uploaded photo; answers { id, message } (404 no such place). Its reviews go with it by a database trigger (supabase/sql/051); the place's uploaded photo and its reviews' photo files are then deleted from Storage (ticket 121)
- GET /v1/admin/places — also answers each place's review_count (hidden reviews too), for the Delete pop-up on the list (ticket 121; Delete is on the list since 2026-11-10, team request)
- GET /v1/admin/reviews?q=&show=all|hidden|reported&sort=recent|relevant|top&per_page=10|25|50&page=N — one page of reviews (ticket 122; numbered pages and sorting since ticket 130, which replaced `before` and "Show more"), each with its place, photos, Helpful count, hidden, report count and reply count; answers { reviews, total, page, per_page }; 400 with a plain sentence for a wrong filter, sort, page size or page, or a search over 100 characters
- **Change (2026-11-11, ticket 130):** GET /v1/admin/reviews?q=&show=all|hidden|reported&sort=recent|relevant|top&per_page=10|25|50&page=1 — numbered pages instead of `before`: answers { reviews, total, page, per_page } (400 with a plain sentence for a wrong sort, number per page or page)
- **Change (2026-11-11, ticket 129):** GET /v1/admin/places also answers each place's created_at and average_rating (visible reviews; null without reviews), for sorting
- POST /v1/admin/reviews/:id/show — shows a hidden review again and keeps its reports; 200 { id, message }, 404 when the review is gone (ticket 123). Delete review on the Reviews screen asks in the same pop-up as Delete place
- GET /v1/admin/reviews/:id/replies — the review's replies, oldest first (deleted ones included, with no writer, name or text; 404 unknown review; ticket 124)
- DELETE /v1/admin/replies/:id — deletes a reply (it stays as "This reply was deleted" when it has answers); answers { id, outcome: "kept" | "removed", message }, 404 when it is gone; through the database function admin_delete_reply (supabase/sql/052), the same rule as the writer's own delete
- GET /v1/admin/reviews/:id/likes and GET /v1/admin/replies/:id/likes — who marked it Helpful: { user_id, display_name, created_at }
- DELETE /v1/admin/reviews/:id/likes/:userId and DELETE /v1/admin/replies/:id/likes/:userId — removes that traveler's like; answers { helpful_count } (and a message; 404 when it is already gone). Who liked: through the admin-only database function admin_likers (supabase/sql/053), display names only (ticket 125)
- GET /v1/categories — anyone; every category and kind (id, name, applies_to), for the home page and the place form
- GET /v1/admin/categories — each with how many places use it
- POST /v1/admin/categories — { name, applies_to }; adds one (400 for a wrong length, 409 "That name is already used.")
- DELETE /v1/admin/categories/:id — deletes an unused one (409 "Some places still use it." otherwise)

**Photo credits round (2026-11-11), admins only for writes (401 logged out, 403 for a traveler):**
- GET /v1/admin/places/:type/:id — also answers the place's credits (or none yet)
- PUT /v1/admin/places/:type/:id/credits — saves the credits; 400 with a plain sentence for a missing or too long field, a URL that is not https, or "All rights reserved" without "Permission from the owner"
- POST /v1/admin/places/:type — also takes the credits with the new place; nothing is saved if they are wrong
- GET /v1/admin/places — each place also says whether its credit is missing
- GET /v1/destinations/:id and GET /v1/accommodations/:id — anyone; also the credit line, licence and link (no status)
- GET /v1/photo-credits — anyone; every saved credit with its place's name, for the Photo credits page (only allowed ones, ticket 138)
- Every public destination and accommodation answer (lists, nearby, one place) — photo_url is null until the place's credits are saved with an allowed status; then the website shows the splash art (ticket 138)

**Admin extras round (2026-11-12), admins only (401 logged out, 403 for a traveler):**
- POST /v1/admin/replies/:id/hide and POST /v1/admin/replies/:id/show — hide or show a reply; answer the reply
- PATCH /v1/admin/categories/:id — { name, icon, photo_place_id }; 400 for a wrong length, icon or place; 409 "That name is already used."
- POST /v1/admin/places/:type/:id/photos — one more photo (form data "photo" plus its credits fields); 400 for a seventh photo or a wrong file or credits
- PATCH /v1/admin/places/:type/:id/photos/:photoId — { position } moves it (position 1 is the cover); PUT …/photos/:photoId/credits saves its credits; DELETE …/photos/:photoId deletes it (the last photo cannot be deleted)
- GET /v1/admin/trash — what is in the Trash, newest first, each with when, by whom and expires_at (expired items deleted first, ticket 149); POST /v1/admin/trash/reviews/:id/restore — puts a review back (404 not in the Trash; 409 when its writer has written a new review of the place since, or while its place is in the Trash); DELETE /v1/admin/reviews/:id now moves the review to the Trash (ticket 147); POST /v1/admin/trash/replies/:id/restore — puts a reply back in its thread (404; 409 while its review is in the Trash); POST /v1/admin/trash/places/:type/:id/restore — brings a place back with its reviews (404); DELETE /v1/admin/replies/:id and DELETE /v1/admin/places/:type/:id now move them to the Trash (ticket 148); DELETE /v1/admin/trash/reviews/:id, /trash/replies/:id and /trash/places/:type/:id — Delete for good, with the photo files (404 when not in the Trash; ticket 149)
- The admin deletes (reviews, replies, places) now mark the item as in the Trash (nothing is copied; see the Trash change note)
- GET /v1/destinations/:id and GET /v1/accommodations/:id — also photos: [{ url, credit_line, licence, source_url }], allowed photos only, cover first; GET /v1/reviews (and the place pages) — a hidden reply's text is replaced for everyone but its writer

**Security hardening round (from docs/LATER.md, parked after evaluations 2026-11-04 and 2026-11-05):**
- No new backend endpoints. All existing backend endpoints are now accessed through Next.js API routes under /api/*:
  - GET /api/v1/destinations — proxies to backend GET /v1/destinations
  - GET /api/v1/destinations/:id — proxies to backend GET /v1/destinations/:id
  - GET /api/v1/destinations/near — proxies to backend GET /v1/destinations/near
  - GET /api/v1/accommodations — proxies to backend GET /v1/accommodations
  - GET /api/v1/accommodations/:id — proxies to backend GET /v1/accommodations/:id
  - GET /api/v1/accommodations/near — proxies to backend GET /v1/accommodations/near
  - GET /api/v1/reviews — proxies to backend GET /v1/reviews
  - POST /api/v1/reviews — proxies to backend POST /v1/reviews
  - PATCH /api/v1/reviews/:id — proxies to backend PATCH /v1/reviews/:id
  - DELETE /api/v1/reviews/:id — proxies to backend DELETE /v1/reviews/:id
  - POST /api/v1/reviews/:id/like — proxies to backend POST /v1/reviews/:id/like
  - DELETE /api/v1/reviews/:id/like — proxies to backend DELETE /v1/reviews/:id/like
  - POST /api/v1/reviews/:id/replies — proxies to backend POST /v1/reviews/:id/replies
  - DELETE /api/v1/replies/:id — proxies to backend DELETE /v1/replies/:id
  - PATCH /api/v1/replies/:id — proxies to backend PATCH /v1/replies/:id
  - POST /api/v1/replies/:id/like — proxies to backend POST /v1/replies/:id/like
  - DELETE /api/v1/replies/:id/like — proxies to backend DELETE /v1/replies/:id/like
  - POST /api/v1/reviews/:id/report — proxies to backend POST /v1/reviews/:id/report
  - POST /api/v1/reviews/:id/photos — proxies to backend POST /v1/reviews/:id/photos
  - DELETE /api/v1/reviews/:id/photos/:photoId — proxies to backend DELETE /v1/reviews/:id/photos/:photoId
  - GET /api/v1/ratings — proxies to backend GET /v1/ratings
  - GET /api/v1/travelers/:id — proxies to backend GET /v1/travelers/:id
  - GET /api/v1/auth/me — proxies to backend GET /v1/auth/me
  - PATCH /api/v1/auth/me — proxies to backend PATCH /v1/auth/me
  - POST /api/v1/auth/signup — proxies to backend POST /v1/auth/signup
  - POST /api/v1/auth/login — proxies to backend POST /v1/auth/login
  - POST /api/v1/auth/refresh — proxies to backend POST /v1/auth/refresh
  - POST /api/v1/auth/logout — proxies to backend POST /v1/auth/logout
  - GET /api/v1/notifications — proxies to backend GET /v1/notifications
  - POST /api/v1/notifications/read — proxies to backend POST /v1/notifications/read
  - POST /api/v1/admin/login — proxies to backend POST /v1/admin/login
  - GET /api/v1/admin/me — proxies to backend GET /v1/admin/me
  - GET /api/v1/admin/overview — proxies to backend GET /v1/admin/overview
  - GET /api/v1/admin/reports — proxies to backend GET /v1/admin/reports
  - POST /api/v1/admin/reviews/:id/keep — proxies to backend POST /v1/admin/reviews/:id/keep
  - POST /api/v1/admin/reviews/:id/hide — proxies to backend POST /v1/admin/reviews/:id/hide
  - DELETE /api/v1/admin/reviews/:id — proxies to backend DELETE /v1/admin/reviews/:id
  - POST /api/v1/admin/reviews/:id/show — proxies to backend POST /v1/admin/reviews/:id/show
  - GET /api/v1/admin/places — proxies to backend GET /v1/admin/places
  - GET /api/v1/admin/places/:type/:id — proxies to backend GET /v1/admin/places/:type/:id
  - PATCH /api/v1/admin/places/:type/:id — proxies to backend PATCH /v1/admin/places/:type/:id
  - POST /api/v1/admin/places/:type — proxies to backend POST /v1/admin/places/:type
  - POST /api/v1/admin/places/:type/:id/photo — proxies to backend POST /v1/admin/places/:type/:id/photo
  - DELETE /api/v1/admin/places/:type/:id — proxies to backend DELETE /v1/admin/places/:type/:id
  - GET /api/v1/admin/reviews/:id/replies — proxies to backend GET /v1/admin/reviews/:id/replies
  - DELETE /api/v1/admin/replies/:id — proxies to backend DELETE /v1/admin/replies/:id
  - GET /api/v1/admin/reviews/:id/likes — proxies to backend GET /v1/admin/reviews/:id/likes
  - GET /api/v1/admin/replies/:id/likes — proxies to backend GET /v1/admin/replies/:id/likes
  - DELETE /api/v1/admin/reviews/:id/likes/:userId — proxies to backend DELETE /v1/admin/reviews/:id/likes/:userId
  - DELETE /api/v1/admin/replies/:id/likes/:userId — proxies to backend DELETE /v1/admin/replies/:id/likes/:userId
  - GET /api/v1/categories — proxies to backend GET /v1/categories
  - GET /api/v1/admin/categories — proxies to backend GET /v1/admin/categories
  - POST /api/v1/admin/categories — proxies to backend POST /v1/admin/categories
  - DELETE /api/v1/admin/categories/:id — proxies to backend DELETE /v1/admin/categories/:id
  - GET /api/v1/photo-credits — proxies to backend GET /v1/photo-credits
  - PUT /api/v1/admin/places/:type/:id/credits — proxies to backend PUT /v1/admin/places/:type/:id/credits
  - POST /api/v1/admin/replies/:id/hide — proxies to backend POST /v1/admin/replies/:id/hide
  - POST /api/v1/admin/replies/:id/show — proxies to backend POST /v1/admin/replies/:id/show
  - PATCH /api/v1/admin/categories/:id — proxies to backend PATCH /v1/admin/categories/:id
  - POST /api/v1/admin/places/:type/:id/photos — proxies to backend POST /v1/admin/places/:type/:id/photos
  - PATCH /api/v1/admin/places/:type/:id/photos/:photoId — proxies to backend PATCH /v1/admin/places/:type/:id/photos/:photoId
  - PUT /api/v1/admin/places/:type/:id/photos/:photoId/credits — proxies to backend PUT /v1/admin/places/:type/:id/photos/:photoId/credits
  - DELETE /api/v1/admin/places/:type/:id/photos/:photoId — proxies to backend DELETE /v1/admin/places/:type/:id/photos/:photoId
  - GET /api/v1/admin/trash — proxies to backend GET /v1/admin/trash
  - POST /api/v1/admin/trash/reviews/:id/restore — proxies to backend POST /v1/admin/trash/reviews/:id/restore
  - POST /api/v1/admin/trash/replies/:id/restore — proxies to backend POST /v1/admin/trash/replies/:id/restore
  - POST /api/v1/admin/trash/places/:type/:id/restore — proxies to backend POST /v1/admin/trash/places/:type/:id/restore
  - DELETE /api/v1/admin/trash/reviews/:id — proxies to backend DELETE /v1/admin/trash/reviews/:id
  - DELETE /api/v1/admin/trash/replies/:id — proxies to backend DELETE /v1/admin/trash/replies/:id
  - DELETE /api/v1/admin/trash/places/:type/:id — proxies to backend DELETE /v1/admin/trash/places/:type/:id
- The Next.js API route layer accepts requests with the same path structure as the backend, forwards only paths starting with v1/ (anything else 404 without calling the backend) and the methods GET, POST, PUT, PATCH, DELETE; forwards only the Authorization, Content-Type, Accept and X-Forwarded-For headers, the body as raw bytes (photo uploads arrive intact; Vercel caps a body at 4.5 MB) and the query string; and returns the backend's status code, body, Content-Type and Cache-Control. A backend that does not answer within 60 seconds (the photo uploads' own limit; code review 2026-11-20) gives 504, a browser that gives up first stops the call, one that cannot be reached 502. Server components call the backend directly at API_URL, not through /api (ticket 152). The backend address is stored in a server-side environment variable (API_URL, not NEXT_PUBLIC_), never exposed to the browser.
- Content-Security-Policy header is set on the Next.js application (in src/proxy.ts). The policy allows scripts and styles from the site's own domain, images from Supabase Storage and Wikimedia Commons, and connections to Supabase for Realtime updates. The CSP is tested in report-only mode first, then enforced after verification.

## Architecture

**Frontend (Next.js):**
- App Router + TypeScript
- Tailwind CSS with UI components in `src/components/ui/`
- Polish round: Lucide icons (`lucide-react`, already installed) for every icon; Motion (the `motion` package, formerly Framer Motion) for animations, set to follow the device's "reduce motion" setting (the fade-up of whatever is on screen when a page loads is plain CSS instead, so it never waits for the page's JavaScript and the text is in the page from the server; Motion takes over for scrolling, and only hides what is off screen once the JavaScript has loaded); TanStack Query for the reviews fetched in the browser (reading, plus writing, editing and deleting as updates to its copy). Places stay fetched on the Next.js server, and the login keeps its own code
- Navigation round: "who is logged in" is read through TanStack Query, kept per login, so every component shares one copy and logging in or out (in this tab or another) refreshes it. Login renewal (the timer, the one-tab-at-a-time lock and the retries) keeps its own code. The fade between pages is opacity only, with no movement, because a moving page wrapper would stop the floating navbar and scroll-to-top button from staying in place; the old page does not animate out (the App Router cannot keep it on screen without an experimental setting)
- Security hardening round: all backend calls go through Next.js API routes under /api/*, which forward requests to the NestJS backend. The backend address is stored in a server-side environment variable (API_URL), never exposed to the browser. A Content-Security-Policy header is added to control which resources the browser may load. Before this round, the browser called the backend directly; after this round, the browser only calls Next.js, and Next.js calls the backend.
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

Profile & replies, thread care, and moderation & photos rounds: changing your name, editing replies, marking replies helpful and the notifications bell need an account. The Reports screen needs an account that the team has added to the admins table by hand; there is no way to become an admin from the app.

Full admin management round: nothing changes for travelers. Adding, editing and deleting places, the Reviews screen and removing likes need an admin account, like the rest of the dashboard.

Photo credits round: travelers need no login to see credits. Saving them needs an admin account.

Admin extras round: nothing new for travelers' logins. Hiding replies, editing categories, place photos and the Trash need an admin account.

Admin dashboard & moderation round (changed 2026-11-08): the Lakat Iloilo team signs in on its own page, /admin/login, with the same kind of Supabase Auth account (email and password). Only accounts in the admins table get in; the app keeps the admin's login the same way as a traveler's, so an admin is also logged in on the traveler site. Nobody can become an admin through the app.

Security hardening round: no login changes. The same Supabase Auth flow continues to work. Login tokens are still sent through the proxy to the backend, which validates them with Supabase Auth. The browser's network inspection shows only calls to /api/*, not direct backend calls.

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

**Profile & replies round (live URL):**
- [x] A traveler changes their display name and traveler type on their profile, and the new ones show on the profile, the dropdown and all their old reviews and replies after a refresh
- [x] A traveler can edit their own reply; it shows "· edited"; editing someone else's reply is refused by the database
- [x] A logged-in traveler can mark another traveler's reply Helpful and unmark it; their own reply only shows the count, and the database refuses a like on it
- [x] An unknown traveler's profile page shows "We couldn't find this traveler" and answers 404 (checked with curl)
- [x] A traveler's profile shows the photo on each review that has one, and clicking it opens it larger; reviews without a photo look the same

**Thread care round (live URL):**
- [x] Deleting a reply with answers leaves "This reply was deleted" with its answers still under it; deleting a reply with none removes it
- [x] Threads start folded with "Show replies"; each level opens on its own; an open reply with more than 3 answers shows "Show N more replies"; Hide replies folds it again, on a laptop and a phone
- [x] Replying to a review from a second account puts a notification on the review writer's bell within a few seconds; clicking it opens the place and marks it read; Mark all as read works
- [x] A traveler's own replies never notify them, and one traveler cannot read another's notifications (checked through the backend)
- [x] Marking a review or reply Helpful from a second account notifies its writer within a few seconds; removing the mark removes the notification; your own never notify you

**Admin dashboard & moderation round (live URL):**
- [x] An admin signs in at /admin/login and sees the dashboard with its four tiles and newest reports; a traveler account is refused there with "This sign-in is for the Lakat Iloilo team." and is not logged in
- [x] Logged out or as a traveler, every /admin page except the sign-in shows "not found", and every admin endpoint answers 401 logged out and 403 for a traveler (checked with curl)
- [x] After 3 different accounts report a review, it disappears for everyone else and from the rating, and its writer sees "Hidden while the team reviews it."
- [x] On Reports, Keep it, Hide it and Delete review all work
- [x] On Places, an admin edits a destination's and an accommodation's description and address, and the change shows on the site; a traveler cannot change a place (refused by the database)
- [x] The dashboard works with the keyboard alone, its text passes WCAG AA contrast, and it works at 375 px and on a laptop
- [x] A traveler can add up to 4 photos to a review, remove one, and open them larger with next and previous; a 5th is refused; old single photos still show
- [x] Row Level Security is on for admins, notifications, reply_likes, review_photos, destinations and accommodations, and no service_role or sb_secret_ key appears anywhere

**Full admin management round (live URL):**
- [x] An admin adds a destination and an accommodation with a photo chosen from their computer; each shows on the home page and has its own page
- [x] An admin changes a place's category or kind, location, latitude and longitude, and replaces its photo; a PDF or a photo over 2 MB is refused with a plain message
- [x] An admin deletes a place after "Yes, delete"; it and its reviews are gone from the site
- [x] On Reviews, an admin finds a review by searching, hides it, shows it again and deletes one; All / Hidden / Reported narrow the list
- [x] An admin deletes a reply; one with answers stays as "This reply was deleted"
- [x] An admin sees who marked a review and a reply Helpful and removes a like; the count drops on the site
- [x] An admin adds a new category, gives a place that category, and it shows on the home page with its chip and list; deleting a category that is in use is refused, and an unused one is deleted
- [x] With the Reviews screen open, a review posted, hidden or reported from another window shows there within a few seconds, without a reload, and the search text and open replies are kept
- [x] After deleting a review, a reply, a place and a like, Undo within 8 seconds puts each back; without Undo it is really deleted
- [x] Logged out or as a traveler, the new pages show "not found" and the new endpoints answer 401 or 403 (checked with curl); a traveler cannot add, change or delete a place, delete someone else's reply or like, or upload a place photo (refused by the database)
- [x] On Places, Reviews and Reports, Sort (Recently added / Most relevant / Top-rated) and Show 10 / 25 / 50 change the list, and Previous, Next and the page numbers move through it; "Showing 11–20 of N" is right
- [x] Row Level Security is on for every table, the place-photos bucket has its policies, and no service_role or sb_secret_ key appears anywhere

**Photo credits round (live URL):**
- [x] An admin adds a place with its photo credits; the credit line shows under the photo on its page and on the Photo credits page
- [x] An admin edits a place's credits; "All rights reserved" without "Permission from the owner", a missing photographer or a URL that is not https is refused with a plain message
- [x] Places with no credits, or "Not checked yet", show "Credit missing" on /admin/places
- [x] A traveler or a logged-out visitor cannot change credits (401 or 403 by curl, refused by the database); travelers never see the authorization status
- [x] A place without allowed credits shows the splash art (the wide 1920 × 1080 art) and no credit line; saving allowed credits shows its real photo
- [x] Row Level Security is on for place_photo_credits, and no service_role or sb_secret_ key appears anywhere

**Admin extras round (live URL):**
- [x] With /admin/places open, a place added or edited in another window shows within a few seconds without a reload
- [x] An admin hides a reply: travelers see "This reply was hidden by the Lakat Iloilo team.", its writer sees their text marked hidden, answers under it stay; Show it brings it back
- [x] An admin renames a category, gives it an icon and a card photo, and the home page shows them; a name already used is refused
- [x] A place gets up to 6 photos, each with its own credits; a new cover shows on the cards; the place page shows the allowed photos with their credit lines; a seventh is refused
- [x] A review, a reply and a place deleted by an admin appear in Trash; Restore brings each back with its replies, likes and photos; Delete for good removes it
- [x] Logged out or as a traveler, the new endpoints answer 401 or 403 (curl) and the database refuses the same changes
- [x] Row Level Security is on for place_photos and trash, and no service_role or sb_secret_ key appears anywhere

**Security hardening round (live URL):**
- [x] Next.js API route proxy layer created under /api/[...path]
- [x] All backend calls in src/lib/api.ts updated to use /api/* instead of direct backend calls
- [x] NEXT_PUBLIC_API_URL removed from client-side code; backend address stored in server-side API_URL environment variable
- [x] Content-Security-Policy header added in report-only mode
- [x] CSP tested to ensure Supabase Realtime still works (live updates arrive)
- [x] CSP tested to ensure review photos load from Supabase Storage
- [x] CSP tested to ensure place photos load from Supabase Storage and Wikimedia
- [x] CSP tested to ensure Next.js scripts and styles work correctly
- [x] CSP tested to ensure admin dashboard functions correctly
- [x] CSP switched from report-only to enforced mode after verification
- [x] Browser network inspection shows only calls to /api/*, not direct backend calls
- [x] Backend address is not visible in browser JavaScript or network tab
- [x] All existing features (home, detail pages, reviews, login, admin dashboard) work as before
- [x] Live updates (Supabase Realtime) continue to work
- [x] Photo uploads and display continue to work

## Out of scope
- Admin extras round: travelers' own deletes going to the Trash (it is for admin deletes only), restoring a single Helpful like or notifications, uploading a new photo just for a category card, reordering photos by dragging (arrow buttons instead), more than 6 photos per place, and a scheduled job to empty the Trash
- Photo credits round: removing a place's credits once saved (they can be changed, not cleared), moving the 30 hard-coded Wikimedia credits into the table (they keep working as they are), credits for travelers' review photos, and checking automatically whether a URL or licence is real (the team checks by hand; the status records it)
- Full admin management round: picking a place's position on a map (the map library is still parked), more than one photo per place, hiding a reply (replies can only be deleted), renaming a category or choosing its icon or photo, bringing something back after the 8-second Undo has passed, a live Places list, managing or banning travelers' accounts, and making or removing admins from the app
- Admin dashboard & moderation round (was "moderation & photos round"): adding or deleting places and uploading place photos from the dashboard, making someone an admin or removing them from the app, managing travelers, banning travelers, appeals, a live Reports list (change 2026-11-09: the Overview's numbers and newest reports do update live), charts or history beyond the four tiles, a second login step for admins, keeping reports when a review is deleted, reordering photos, and photos over 2 MB
- Thread care round: email or phone notifications (a custom email sender is still parked), notifications for new reviews, and a limit on thread depth or reply rate (Helpful-mark notifications moved into the round on 2026-11-07, ticket 106)
- Profile & replies round: changing the email or password from the profile, profile pictures, and a public profile for travelers with no reviews
- Live updates round: live reports (no screen shows reports and nobody may read them through the app; seeing reports as they arrive needs an admin screen), "new review" pop-ups or sounds, live traveler profile pages, and using the rows Realtime sends directly in the page
- Likes on TypeORM round: moving the other hand-written SQL (adding, editing and deleting reviews, the act-as-the-traveler step) onto TypeORM, and any change travelers can see
- Navigation round: login renewal through TanStack Query, the old page animating out, and the experimental "view transitions" setting (parked in docs/LATER.md)
- Polish round: fetching places in the browser (parked in docs/LATER.md); "who is logged in" and page transitions moved into the navigation round
- Login for anything other than reviews (browsing stays open to everyone)
- A custom email sender for reset emails (changing the display name and traveler type moved into the profile & replies round on 2026-11-05)
- Social logins
- Threaded replies round: nothing left here; "This reply was deleted", folding threads and notifications moved into the thread care round on 2026-11-05
- Profiles & likes and review extras rounds: photos over 2 MB (editing replies and likes on replies moved into the profile & replies round; auto-hiding reported reviews, the Reports screen and up to four photos into the moderation & photos round, on 2026-11-05)
- Buttons & cards round: email confirmation for new accounts (parked: a custom email sender needs an outside service the team has not agreed to), and a "Get directions in Google Maps" button on destinations
- Filtering or sorting by rating (star ratings on the home page cards moved into the buttons & cards round)
- Booking/payments for any services
- Map integration (PostGIS added for future use, but no map UI in MVP). A Mapbox map is parked in docs/LATER.md until the team decides on it
- A full search results page, advanced filters, or searching inside descriptions (live suggestions match names and addresses only)
- Social features (sharing, favorites)
- Advanced spatial queries beyond radius search
- Password reset through the backend and "Nearby places" using the /near endpoints (parked in docs/LATER.md; keeping the backend address private moved into the security hardening round)
- Listing all users (needs the service_role key, which this project never uses) and logging out of every device at once
- Blurred photo previews, speeding up the backend, and skeletons on the Photo credits page (it has no data to wait for)
- Security hardening round: moving Supabase Auth calls (forgot password, set new password) through the proxy — these still use Supabase's browser library directly; adding nonce or hash-based CSP — using 'unsafe-inline' for styles is acceptable for this phase; implementing a full API gateway or rate limiting at the proxy layer; adding authentication to the proxy itself (the backend still validates tokens); CSP blocking external fonts or analytics (none are used in the current stack); CSP blocking all inline scripts (some may be needed for third-party libraries in the future)
