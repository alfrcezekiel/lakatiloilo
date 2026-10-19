-- Replace three accommodations that could not be found anywhere.
--
-- "Sheraton Iloilo", "Citi Residences" and "The Venue" came from the sample
-- data in 005. No listing, directory or booking site mentions them in
-- Iloilo, so a beta tester could go looking for a place that does not exist.
-- Each row is updated in place (same id, same photo) to a real place that
-- appears in several public listings (looked up 2026-10-19).
--
-- Coordinates are approximate positions inside Iloilo Business Park,
-- Mandurriao; check them on a map before relying on /near results.
-- Contact details are only filled in where several listings agree.
--
-- Safe to run more than once.

-- Hotel: Courtyard by Marriott Iloilo. Main line agrees across directory
-- listings and Marriott's own page.
update accommodations
set name = 'Courtyard by Marriott Iloilo',
    address = 'Iloilo Business Park, Mandurriao, Iloilo City',
    phone = '+63 33 330 7600',
    email = null,
    description = 'An international hotel brand in Iloilo Business Park, '
      || 'within walking distance of Festive Walk Mall and the Iloilo '
      || 'Convention Center.',
    type = 'hotel',
    location_type = 'iloilo_city',
    latitude = 10.7140,
    longitude = 122.5470
where name in ('Sheraton Iloilo', 'Courtyard by Marriott Iloilo');

-- Condominium: The Belmont Hotel Iloilo, a Megaworld condotel (hotel run in
-- a condominium building) along Festive Walk.
update accommodations
set name = 'The Belmont Hotel Iloilo',
    address = 'Festive Walk, Iloilo Business Park, Mandurriao, Iloilo City',
    phone = null,
    email = null,
    description = 'A 12-storey condotel by Megaworld along the Festive Walk '
      || 'parade, with suites, a pool, a gym and an all-day restaurant.',
    type = 'condominium',
    location_type = 'iloilo_city',
    latitude = 10.7132,
    longitude = 122.5458
where name in ('Citi Residences', 'The Belmont Hotel Iloilo');

-- Condominium: The Palladium, Megaworld's condominium tower in Iloilo
-- Business Park, where owners rent out units to guests.
update accommodations
set name = 'The Palladium',
    address = 'Iloilo Business Park, Mandurriao, Iloilo City',
    phone = null,
    email = null,
    description = 'A Megaworld condominium tower in Iloilo Business Park. '
      || 'Units are rented out by their owners through booking sites, with '
      || 'access to an infinity pool, gym and sky gardens.',
    type = 'condominium',
    location_type = 'iloilo_city',
    latitude = 10.7150,
    longitude = 122.5485
where name in ('The Venue', 'The Palladium');

-- Keep the PostGIS point in step with the new coordinates.
update accommodations
set location = extensions.st_setsrid(
      extensions.st_makepoint(longitude, latitude), 4326)::extensions.geography
where name in ('Courtyard by Marriott Iloilo', 'The Belmont Hotel Iloilo',
               'The Palladium');

-- Check: the three replaced rows.
select name, type, address, phone, email, latitude, longitude
from accommodations
where name in ('Courtyard by Marriott Iloilo', 'The Belmont Hotel Iloilo',
               'The Palladium')
order by name;
