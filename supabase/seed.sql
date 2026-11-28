-- Fake starter data for local development and staging.
--
-- What it adds: the 8 place categories, 10 destinations (3 mountains,
-- 3 festivals, 4 others), 4 accommodations and one fake local admin login
-- (section 4 at the bottom: admin@lakat.local).
-- Everything is invented. The places and festivals are fictional, although
-- they sit in real Iloilo towns so the map looks right. Phone numbers use a
-- made-up 555 range, emails use example.com, and photo links are placeholders
-- that do not load a real image.
--
-- `npx supabase db reset` runs this file automatically on the LOCAL database.
-- Never run it on production. Running it twice is safe: fixed ids plus
-- "on conflict do nothing" mean no duplicates.
--
-- You will not see a "location" column below. The database builds that PostGIS
-- point (a map coordinate it can search by distance) from latitude and
-- longitude. It also creates each place's first place_photos row by itself.

-- 1. Categories (must come first: places are checked against this list) ----

insert into public.place_categories (id, name, applies_to, icon) values
    ('mountain', 'Mountains', 'destination', 'mountain'),
    ('food', 'Food', 'destination', 'utensils'),
    ('festival', 'Festivals', 'destination', 'party'),
    ('walking', 'Walking Areas', 'destination', 'footprints'),
    ('nature', 'Nature & Parks', 'destination', 'trees'),
    ('heritage', 'Heritage Sites', 'destination', 'landmark'),
    ('hotel', 'Hotels', 'accommodation', 'hotel'),
    ('condominium', 'Condominiums', 'accommodation', 'building')
on conflict (id) do nothing;

-- 2. Destinations -----------------------------------------------------------

insert into public.destinations
    (id, name, address, latitude, longitude, photo_url, description, category, location_type)
values
    ('10000000-0000-4000-8000-000000000001', 'Mount Talabukon',
     'Sitio Talabukon, Igbaras, Iloilo', 10.7560, 122.2150,
     'https://example.com/lakat-seed/mount-talabukon.jpg',
     'A fictional day hike through upland farms to a grassy summit. Start early, bring two liters of water, and register at the barangay hall.',
     'mountain', 'iloilo_province'),
    ('10000000-0000-4000-8000-000000000002', 'Mount Hinagdanan Ridge',
     'Barangay Hinagdanan, Leon, Iloilo', 10.8240, 122.3180,
     'https://example.com/lakat-seed/mount-hinagdanan.jpg',
     'A fictional cool-weather ridge walk with wide views of the southern Iloilo lowlands. Trails can be slippery after rain.',
     'mountain', 'iloilo_province'),
    ('10000000-0000-4000-8000-000000000003', 'Mount Banwaon Peak',
     'Sitio Banwaon, Calinog, Iloilo', 11.1620, 122.4210,
     'https://example.com/lakat-seed/mount-banwaon.jpg',
     'A fictional two-day climb through mossy forest in the central highlands. Best for hikers with some experience and a local guide.',
     'mountain', 'iloilo_province'),
    ('10000000-0000-4000-8000-000000000004', 'Saad sang Suba Festival',
     'Riverside Plaza, Molo, Iloilo City', 10.6970, 122.5450,
     'https://example.com/lakat-seed/saad-sang-suba.jpg',
     'A fictional river festival with lantern boats, school drum groups and a night market along the water every February.',
     'festival', 'iloilo_city'),
    ('10000000-0000-4000-8000-000000000005', 'Pista sang Humay',
     'Town Plaza, Pototan, Iloilo', 10.9430, 122.6350,
     'https://example.com/lakat-seed/pista-sang-humay.jpg',
     'A fictional harvest celebration with rice-straw art, farm parades and shared meals in the plaza every October.',
     'festival', 'iloilo_province'),
    ('10000000-0000-4000-8000-000000000006', 'Bugsay Sea Festival',
     'Baybay Road, Estancia, Iloilo', 11.4530, 123.1500,
     'https://example.com/lakat-seed/bugsay-sea-festival.jpg',
     'A fictional coastal festival with paddle races, seafood stalls and street dancing by the port every May.',
     'festival', 'iloilo_province'),
    ('10000000-0000-4000-8000-000000000007', 'Kusina Baybayon Food Row',
     'Baybayon Street, Oton, Iloilo', 10.6930, 122.4780,
     'https://example.com/lakat-seed/kusina-baybayon.jpg',
     'A fictional row of family food stalls serving grilled fish, batchoy and native kakanin from late afternoon until night.',
     'food', 'iloilo_province'),
    ('10000000-0000-4000-8000-000000000008', 'Paseo Lagoon Walk',
     'Lagoon Road, Mandurriao, Iloilo City', 10.7170, 122.5400,
     'https://example.com/lakat-seed/paseo-lagoon.jpg',
     'A fictional shaded walking path around a city lagoon, with benches, bike lanes and coffee carts. Popular at sunrise.',
     'walking', 'iloilo_city'),
    ('10000000-0000-4000-8000-000000000009', 'Tubod Spring Nature Park',
     'Barangay Tubod, Lambunao, Iloilo', 11.0710, 122.4320,
     'https://example.com/lakat-seed/tubod-spring.jpg',
     'A fictional community-run park with a cold spring, bamboo picnic huts and a short forest loop suitable for families.',
     'nature', 'iloilo_province'),
    ('10000000-0000-4000-8000-000000000010', 'Casa Dalipe Heritage House',
     'Calle Dalipe, Jaro, Iloilo City', 10.7250, 122.5570,
     'https://example.com/lakat-seed/casa-dalipe.jpg',
     'A fictional restored ancestral house with capiz windows, old family furniture and a small museum of local weaving.',
     'heritage', 'iloilo_city')
on conflict (id) do nothing;

-- 3. Accommodations ---------------------------------------------------------

insert into public.accommodations
    (id, name, address, phone, email, latitude, longitude, photo_url, description, type, location_type)
values
    ('20000000-0000-4000-8000-000000000001', 'Hotel Amihan Iloilo',
     '12 Amihan Avenue, City Proper, Iloilo City', '+63 33 555 0101', 'stay@amihan-hotel.example.com',
     10.6980, 122.5620,
     'https://example.com/lakat-seed/hotel-amihan.jpg',
     'A fictional mid-range city hotel with breakfast included, airport shuttle and a walkable location near the river.',
     'hotel', 'iloilo_city'),
    ('20000000-0000-4000-8000-000000000002', 'Balay Lantaw Inn',
     '8 Lantaw Road, Guimbal, Iloilo', '+63 33 555 0102', 'hello@balaylantaw.example.com',
     10.6640, 122.3220,
     'https://example.com/lakat-seed/balay-lantaw.jpg',
     'A fictional family-run seaside inn with eight rooms, home-cooked meals and an easy ride to the southern towns.',
     'hotel', 'iloilo_province'),
    ('20000000-0000-4000-8000-000000000003', 'Kabukiran Mountain Lodge',
     'Sitio Kabukiran, Leon, Iloilo', '+63 33 555 0103', 'book@kabukiran.example.com',
     10.7900, 122.3700,
     'https://example.com/lakat-seed/kabukiran-lodge.jpg',
     'A fictional simple lodge for hikers, with bunk rooms, hot showers and early breakfast before the trail.',
     'hotel', 'iloilo_province'),
    ('20000000-0000-4000-8000-000000000004', 'Mandurriao Parkview Residences',
     '25 Parkview Drive, Mandurriao, Iloilo City', '+63 33 555 0104', 'rentals@parkview.example.com',
     10.7190, 122.5370,
     'https://example.com/lakat-seed/parkview-residences.jpg',
     'A fictional condominium with furnished studio units for short stays, a kitchenette, Wi-Fi and a rooftop garden.',
     'condominium', 'iloilo_city')
on conflict (id) do nothing;


-- 4. A fake admin account, LOCAL ONLY ----------------------------------------
--
-- Why: every `npm run db:reset` wipes all local accounts, so the team had to
-- recreate an admin by hand after each reset. This brings one back each time.
--
--   Email:    admin@lakat.local
--   Password: lakat-local-admin
--
-- Both are fake and public (they are in this file). That is fine only because
-- this file runs on the LOCAL database. Never run this file on staging or
-- production: anyone who reads the repo could log in as this admin there.
-- (The Deploy workflow never runs seed.sql, so hosted databases are safe.)
--
-- An account needs two rows: one in auth.users (the login, with the password
-- stored scrambled by crypt) and one in auth.identities (says "this login uses
-- email and password"). The token columns must be '' rather than empty (null),
-- or Supabase's login service fails to read the account.

insert into auth.users (
    instance_id, id, aud, role, email, encrypted_password,
    email_confirmed_at, raw_app_meta_data, raw_user_meta_data,
    created_at, updated_at,
    confirmation_token, recovery_token, email_change_token_new, email_change
) values (
    '00000000-0000-0000-0000-000000000000',
    '30000000-0000-4000-8000-000000000001',
    'authenticated', 'authenticated',
    'admin@lakat.local',
    extensions.crypt('lakat-local-admin', extensions.gen_salt('bf')),
    now(),
    '{"provider": "email", "providers": ["email"]}',
    '{"display_name": "Local Admin"}',
    now(), now(),
    '', '', '', ''
)
on conflict (id) do nothing;

insert into auth.identities (
    provider_id, user_id, identity_data, provider, last_sign_in_at, created_at, updated_at
) values (
    '30000000-0000-4000-8000-000000000001',
    '30000000-0000-4000-8000-000000000001',
    '{"sub": "30000000-0000-4000-8000-000000000001", "email": "admin@lakat.local", "email_verified": true}',
    'email', now(), now(), now()
)
on conflict (provider_id, provider) do nothing;

insert into public.admins (user_id) values
    ('30000000-0000-4000-8000-000000000001')
on conflict (user_id) do nothing;