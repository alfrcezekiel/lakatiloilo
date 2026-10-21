# Spec: Iloilo Tourism Platform

## Problem
Travelers planning weekend trips around Iloilo Province cannot easily find diverse destinations—mountains, food spots, walking areas, parks, festivals, and heritage sites—AND places to stay because information is scattered across Facebook, Google, and random websites. They often miss great spots and good accommodations, only discovering them when friends mention them later.

## Solution
A full-stack platform with a Next.js frontend and NestJS backend, where users can browse diverse destinations (mountains, foods & dine-ins, walking areas, festivals, nature & parks, heritage sites) and accommodations (hotels, condominiums) in Iloilo Province. The backend provides versioned APIs with spatial query capabilities for location-based searches.

The home page opens on a redesigned hero where travelers can type a place name and get live suggestions as they type, and narrow those suggestions with category chips and a City/Province toggle.

While places are still being fetched from the NestJS backend, the site shows skeletons — grey, gently pulsing placeholders shaped like the real cards — so travelers can see the page is working and nothing jumps when the real content arrives.

## The user
Travelers planning weekend trips around Iloilo Province. No login required for browsing.

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

PostGIS extension: Enabled on Supabase database. The `location` column stores geography points for spatial queries (e.g., find destinations within X km of a point).

## API Endpoints (NestJS Backend)

**Version 1 (/v1):**
- GET /v1/destinations — returns all destinations (supports query params: category, location_type)
- GET /v1/destinations/:id — returns single destination by ID
- GET /v1/destinations/near — returns destinations within radius (params: lat, lng, radius_km, category)
- GET /v1/accommodations — returns all accommodations (supports query params: type)
- GET /v1/accommodations/:id — returns single accommodation by ID
- GET /v1/accommodations/near — returns accommodations within radius (params: lat, lng, radius_km, type)

**Version 2 (/v2):**
- Reserved for future API changes. v1 remains available to prevent breaking existing clients.

**CORS:** Configured to allow requests from the Next.js frontend domain.

## Architecture

**Frontend (Next.js):**
- App Router + TypeScript
- Tailwind CSS with UI components in `src/components/ui/`
- Fetches data from NestJS backend via HTTP calls
- Deployed on Vercel

**Backend (NestJS):**
- Separate NestJS project in `backend/` directory
- TypeORM or Prisma for Supabase database access
- API versioning modules (v1, v2)
- PostGIS integration for spatial queries
- Deployed separately (platform TBD: Railway, Render, or similar)

**Database (Supabase):**
- Hosted PostgreSQL with PostGIS extension
- Row Level Security enabled
- Storage for images
- Accessed by NestJS backend using environment variables, through a read-only database login (`lakat_api`, see `supabase/sql/016`)

## Login
No login required. The MVP works as a read-only browsing platform.

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

## Out of scope
- User accounts and login system
- Reviews and ratings for destinations
- Booking/payments for any services
- Map integration (PostGIS added for future use, but no map UI in MVP)
- A full search results page, or searching inside descriptions (live suggestions match names and addresses only)
- Admin UI for managing data
- Social features (sharing, favorites)
- Advanced spatial queries beyond radius search
- Blurred photo previews, speeding up the backend, and skeletons on the Photo credits page (it has no data to wait for)
