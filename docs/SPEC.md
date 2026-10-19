# Spec: Iloilo Tourism Platform

## Problem
Travelers planning weekend trips around Iloilo Province cannot easily find diverse destinations—mountains, food spots, walking areas, parks, festivals, and heritage sites—AND places to stay because information is scattered across Facebook, Google, and random websites. They often miss great spots and good accommodations, only discovering them when friends mention them later.

## Solution
A full-stack platform with a Next.js frontend and NestJS backend, where users can browse diverse destinations (mountains, foods & dine-ins, walking areas, festivals, nature & parks, heritage sites) and accommodations (hotels, condominiums) in Iloilo Province. The backend provides versioned APIs with spatial query capabilities for location-based searches.

## The user
Travelers planning weekend trips around Iloilo Province. No login required for browsing.

## User stories
1. As a traveler, I want to browse destinations organized by category (mountains, foods, walking areas, festivals, nature, heritage) and location (Iloilo City vs. Province), so that I can discover places to visit in the area I'm interested in.
2. As a traveler, I want to click on a category card to scroll to that category's section, so that I can quickly navigate to specific types of places.
3. As a traveler, I want to see a list of hotels and condominiums with photos and details, so that I can find a place to stay.
4. As a traveler, I want to click a destination or accommodation to see its full details (name, address, photo, description, contact info), so that I can learn more about it.
5. As a traveler, I want to browse without creating an account, so that I can quickly find information.
6. As a developer, I want the backend to provide versioned APIs (/v1, /v2), so that future API changes don't break existing clients.
7. As a developer, I want PostGIS spatial queries for destinations, so that we can support location-based features later.
8. As a visitor, I want to see a branded footer with Lakat Iloilo name and navigation links, so that I can easily navigate to different sections and understand the platform's identity.

## Screens
1. Home page — shows welcome text, navigation bar, About Iloilo section, Features section, category cards (mountains, food, walking, festivals, nature, heritage, hotels, condominiums) with location filter (All/Iloilo City/Iloilo Province), separate list sections for each destination category, and accommodations list. Clicking a category card scrolls to that category's section; all sections are always visible. Frontend calls NestJS API to fetch data.
2. Destination detail page — shows destination name, address, coordinates, photo, and description. Data fetched from NestJS API.
3. Accommodation detail page — shows accommodation name, address, phone, email, photo, and description. Data fetched from NestJS API.
4. Footer — shows Lakat Iloilo branding with platform name, copyright information, navigation links (Home, About, Features, Explore), and legal section. Background uses teal/emerald gradient to match the overall theme.

## Data

**destinations table:**
- id — unique identifier for each destination
- name — the destination's name (e.g., "Bucari Little Baguio")
- address — text address (e.g., "Leon, Iloilo")
- latitude — coordinate for PostGIS spatial queries
- longitude — coordinate for PostGIS spatial queries
- location — PostGIS geography point (from lat/long)
- photo_url — link to image stored in Supabase Storage
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
- photo_url — link to image stored in Supabase Storage
- description — short text about the accommodation
- type — accommodation type (set to "hotel" or "condominium" for MVP)
- location_type — location type (one of: "iloilo_city", "iloilo_province"); used by the location filter, same as destinations
- created_at — timestamp
- updated_at — timestamp

Row Level Security policy: Anyone may read all rows in both tables. No one may write through the app (data is added via SQL scripts by the team).

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

## Out of scope
- User accounts and login system
- Reviews and ratings for destinations
- Booking/payments for any services
- Map integration (PostGIS added for future use, but no map UI in MVP)
- Text search functionality
- Admin UI for managing data
- Social features (sharing, favorites)
- Advanced spatial queries beyond radius search
