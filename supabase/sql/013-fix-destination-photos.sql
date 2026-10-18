-- Fix destination photos that showed the wrong thing or did not load.
-- Each replacement was opened and checked by eye before being used.
--
--   Balog Falls             scuba diver        -> waterfall in a forest
--   Paraw Regatta Festival  man's portrait     -> sailboat at sea
--   La Paz Batchoy          pizza              -> noodle soup with meat
--   Jaro Cathedral          image did not load -> church interior
--   SM City Iloilo Rooftop Garden
--                           image did not load -> garden path with flowers
--
-- Not changed here: Calle Real still shows a modern kitchen. No stock photo
-- looked like an Iloilo heritage street, so the team should upload a real
-- photo to Supabase Storage and update that row.
--
-- Safe to run more than once: it only sets photo_url on these five rows.

update destinations
set photo_url = 'https://images.unsplash.com/photo-1494472155656-f34e81b17ddc?w=800&q=80'
where name = 'Balog Falls';

update destinations
set photo_url = 'https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&q=80'
where name = 'Paraw Regatta Festival';

update destinations
set photo_url = 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=800&q=80'
where name = 'La Paz Batchoy';

update destinations
set photo_url = 'https://images.unsplash.com/photo-1438032005730-c779502df39b?w=800&q=80'
where name = 'Jaro Cathedral';

update destinations
set photo_url = 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?w=800&q=80'
where name = 'SM City Iloilo Rooftop Garden';

-- Check: should list the five rows with their new photos.
select name, photo_url from destinations
where name in ('Balog Falls', 'Paraw Regatta Festival', 'La Paz Batchoy',
               'Jaro Cathedral', 'SM City Iloilo Rooftop Garden')
order by name;
