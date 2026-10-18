-- Populate PostGIS location columns for destinations
-- Convert existing latitude/longitude to geography points
update destinations
set location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
where latitude is not null and longitude is not null;

-- Set location_type for destinations based on address
-- Iloilo City destinations are tagged as iloilo_city, others as iloilo_province
update destinations
set location_type = 'iloilo_city'
where address ilike '%Iloilo City%';

-- Add latitude and longitude to accommodations with approximate coordinates
update accommodations
set latitude = 10.7200, longitude = 122.5600
where name = 'Hotel del Rio';

update accommodations
set latitude = 10.7100, longitude = 122.5500
where name = 'Richmond Hotel';

update accommodations
set latitude = 10.7000, longitude = 122.5400
where name = 'Seda Atria';

update accommodations
set latitude = 10.7150, longitude = 122.5650
where name = 'Grand Xing Imperial Hotel';

update accommodations
set latitude = 10.6900, longitude = 122.5700
where name = 'Injap Tower Hotel';

update accommodations
set latitude = 10.6950, longitude = 122.5750
where name = 'Sheraton Iloilo';

update accommodations
set latitude = 10.7250, longitude = 122.5550
where name = 'Citi Residences';

update accommodations
set latitude = 10.6880, longitude = 122.5720
where name = 'The Venue';

-- Populate PostGIS location column for accommodations
update accommodations
set location = ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)
where latitude is not null and longitude is not null;

-- Set location_type for accommodations (all are in Iloilo City based on addresses)
update accommodations
set location_type = 'iloilo_city';
