-- Replace stock photos with real photos taken in Iloilo City and Iloilo
-- Province. Every photo comes from Wikimedia Commons under a free licence
-- (CC BY, CC BY-SA or CC0) and was opened and checked by eye. The licences
-- require credit to the photographer: see src/lib/photo-credits.ts.
--
-- Two groups:
--   * a photo of the exact place;
--   * a real photo of the same spot or area, when Commons has no photo of
--     the place itself (noted on each row).
--
-- Not changed, because no free photo of the real place exists on Commons:
--   Agony Hill, Balog Falls, Casanalay Falls, Garita Farm, Mt. Nangtud,
--   Mt. Opao, Sibunag Agri-Tourism Park, Tiniaman Falls, Mama's Kitchen,
--   Hotel del Rio, Richmonde Hotel Iloilo.
-- The team can take their own photos of these, upload them to Supabase
-- Storage and update the rows.
--
-- Safe to run more than once: it only sets photo_url on the rows named.

-- Destinations: photo of the exact place

-- https://commons.wikimedia.org/wiki/File:Bucari_Little_Baguio,_Scenery.jpg (CC BY-SA 4.0, Buczaii)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/4f/Bucari_Little_Baguio%2C_Scenery.jpg/1280px-Bucari_Little_Baguio%2C_Scenery.jpg'
where name = 'Bucari Little Baguio';

-- https://commons.wikimedia.org/wiki/File:Iloilo_Calle_Real_JM_Basa_northbound_(Iloilo_City;_01-21-2023).jpg (CC BY-SA 4.0, Patrickroque01)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/f/fe/Iloilo_Calle_Real_JM_Basa_northbound_%28Iloilo_City%3B_01-21-2023%29.jpg/1280px-Iloilo_Calle_Real_JM_Basa_northbound_%28Iloilo_City%3B_01-21-2023%29.jpg'
where name = 'Calle Real';

-- https://commons.wikimedia.org/wiki/File:Casa_Mariquit,_Jaro,_Iloilo_City.jpg (CC BY-SA 4.0, A.C.T. Alejandre)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/8d/Casa_Mariquit%2C_Jaro%2C_Iloilo_City.jpg/1280px-Casa_Mariquit%2C_Jaro%2C_Iloilo_City.jpg'
where name = 'Casa Mariquit';

-- https://commons.wikimedia.org/wiki/File:Dinagyang_2k26_-_2.jpg (CC BY-SA 4.0, Gelo Yap)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/1/18/Dinagyang_2k26_-_2.jpg/1280px-Dinagyang_2k26_-_2.jpg'
where name = 'Dinagyang Festival';

-- https://commons.wikimedia.org/wiki/File:Iloilo_Esplanade,_La_Paz_(Iloilo_City;_10-22-2022).jpg (CC BY-SA 4.0, Patrickroque01)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/b/bd/Iloilo_Esplanade%2C_La_Paz_%28Iloilo_City%3B_10-22-2022%29.jpg/1280px-Iloilo_Esplanade%2C_La_Paz_%28Iloilo_City%3B_10-22-2022%29.jpg'
where name = 'Iloilo Esplanade';

-- https://commons.wikimedia.org/wiki/File:Iloilo_River_Esplanade_Sunrise.jpg (CC BY-SA 4.0, Johngaje92)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5f/Iloilo_River_Esplanade_Sunrise.jpg/1280px-Iloilo_River_Esplanade_Sunrise.jpg'
where name = 'Iloilo River Esplanade 1-5';

-- https://commons.wikimedia.org/wiki/File:Jaro_Belfry_and_Cathedral.jpg (CC BY-SA 4.0, Gelo Yap)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Jaro_Belfry_and_Cathedral.jpg/1280px-Jaro_Belfry_and_Cathedral.jpg'
where name = 'Jaro Cathedral';

-- https://commons.wikimedia.org/wiki/File:Batchoy_from_La_Paz_Public_Market,_Iloilo_City.jpg (CC BY-SA 4.0, Ralff Nestor Nacor)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/de/Batchoy_from_La_Paz_Public_Market%2C_Iloilo_City.jpg/1280px-Batchoy_from_La_Paz_Public_Market%2C_Iloilo_City.jpg'
where name = 'La Paz Batchoy';

-- https://commons.wikimedia.org/wiki/File:Miagao_Church_(Santo_Tom%C3%A1s_de_Villanueva_Parish_Church).jpg (CC BY-SA 4.0, Christopher Andres)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/33/Miagao_Church_%28Santo_Tom%C3%A1s_de_Villanueva_Parish_Church%29.jpg/1280px-Miagao_Church_%28Santo_Tom%C3%A1s_de_Villanueva_Parish_Church%29.jpg'
where name = 'Miag-ao Church';

-- https://commons.wikimedia.org/wiki/File:Molo_Church_(Molo,_Iloilo_City;_04-03-2024).jpg (CC BY-SA 4.0, Patrickroque01)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/38/Molo_Church_%28Molo%2C_Iloilo_City%3B_04-03-2024%29.jpg/1280px-Molo_Church_%28Molo%2C_Iloilo_City%3B_04-03-2024%29.jpg'
where name = 'Molo Church';

-- https://commons.wikimedia.org/wiki/File:Paraw_Regatta_Sails.jpg (CC BY-SA 4.0, Parizfranz)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/Paraw_Regatta_Sails.jpg/1280px-Paraw_Regatta_Sails.jpg'
where name = 'Paraw Regatta Festival';

-- https://commons.wikimedia.org/wiki/File:San_Joaquin_Campo_Santo_(Iloilo-Antique_Road,_San_Joaquin,_Iloilo;_01-26-2023).jpg (CC BY-SA 4.0, Patrickroque01)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/4/45/San_Joaquin_Campo_Santo_%28Iloilo-Antique_Road%2C_San_Joaquin%2C_Iloilo%3B_01-26-2023%29.jpg/1280px-San_Joaquin_Campo_Santo_%28Iloilo-Antique_Road%2C_San_Joaquin%2C_Iloilo%3B_01-26-2023%29.jpg'
where name = 'San Joaquin Campo Santo';

-- https://commons.wikimedia.org/wiki/File:Batchoy_at_Ted%27s_Oldtimer_Lapaz_Batchoy.jpg (CC BY-SA 4.0, Curpharar)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/0/04/Batchoy_at_Ted%27s_Oldtimer_Lapaz_Batchoy.jpg/1280px-Batchoy_at_Ted%27s_Oldtimer_Lapaz_Batchoy.jpg'
where name = 'Ted''s Oldtimer Batchoy';

-- https://commons.wikimedia.org/wiki/File:Tultugan_Festival_of_Maasin,_Iloilo.jpg (CC BY-SA 4.0, Mhlayson)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/3/32/Tultugan_Festival_of_Maasin%2C_Iloilo.jpg/1280px-Tultugan_Festival_of_Maasin%2C_Iloilo.jpg'
where name = 'Tultugan Festival';


-- Destinations: real photo of the same spot or area

-- Shows the SM City Iloilo mall itself, not the rooftop garden.
-- https://commons.wikimedia.org/wiki/File:SM_City_Iloilo,_Aug_2024_(1).jpg (CC BY-SA 4.0, Ralff Nestor Nacor)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/2d/SM_City_Iloilo%2C_Aug_2024_%281%29.jpg/1280px-SM_City_Iloilo%2C_Aug_2024_%281%29.jpg'
where name = 'SM City Iloilo Rooftop Garden';

-- Shows batchoy at La Paz Public Market, where Netong's stall is.
-- https://commons.wikimedia.org/wiki/File:La_Paz_Batchoy_dish_inside_La_Paz_Public_market_1_(Iloilo_City;_04-05-2024).jpg (CC BY-SA 4.0, Patrickroque01)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/ab/La_Paz_Batchoy_dish_inside_La_Paz_Public_market_1_%28Iloilo_City%3B_04-05-2024%29.jpg/1280px-La_Paz_Batchoy_dish_inside_La_Paz_Public_market_1_%28Iloilo_City%3B_04-05-2024%29.jpg'
where name = 'Netong''s Batchoy';

-- Shows Villa Beach in Arevalo, where the restaurant stands.
-- https://commons.wikimedia.org/wiki/File:Villa_Beach,_Iloilo_City._Philippines_01.jpg (CC BY-SA 4.0, Riyan0721)
update destinations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/9/9f/Villa_Beach%2C_Iloilo_City._Philippines_01.jpg/1280px-Villa_Beach%2C_Iloilo_City._Philippines_01.jpg'
where name = 'Breakthrough Restaurant';


-- Accommodations: photo of the exact place

-- Shows the hotel building.
-- https://commons.wikimedia.org/wiki/File:Grand_Xing_Imperial_Hotel,_Iloilo_City_Proper_2026.jpg (CC BY 4.0, BlockatePollop2)
update accommodations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/8/82/Grand_Xing_Imperial_Hotel%2C_Iloilo_City_Proper_2026.jpg/1280px-Grand_Xing_Imperial_Hotel%2C_Iloilo_City_Proper_2026.jpg'
where name = 'Grand Xing Imperial Hotel';

-- Shows the hotel building.
-- https://commons.wikimedia.org/wiki/File:Seda_Hotel_Iloilo.jpg (CC BY-SA 4.0, Johngaje92)
update accommodations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/d/d4/Seda_Hotel_Iloilo.jpg/1280px-Seda_Hotel_Iloilo.jpg'
where name = 'Seda Atria';

-- Shows the hotel's dining area.
-- https://commons.wikimedia.org/wiki/File:Injap_Tower_Dining_Area,_Iloilo_City,_Sep_2026.jpg (CC BY-SA 4.0, Ralff Nestor Nacor)
update accommodations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/a/a4/Injap_Tower_Dining_Area%2C_Iloilo_City%2C_Sep_2026.jpg/1280px-Injap_Tower_Dining_Area%2C_Iloilo_City%2C_Sep_2026.jpg'
where name = 'Injap Tower Hotel';


-- Accommodations: real photo of the same area

-- Shows Megaworld Boulevard, Iloilo Business Park.
-- https://commons.wikimedia.org/wiki/File:Iloilo_Business_Park,_Megaworld_Boulevard_(Mandurriao,_Iloilo_City;_04-05-2024)_(cropped).jpg (CC BY-SA 4.0, Patrickroque01)
update accommodations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/6/64/Iloilo_Business_Park%2C_Megaworld_Boulevard_%28Mandurriao%2C_Iloilo_City%3B_04-05-2024%29_%28cropped%29.jpg/1280px-Iloilo_Business_Park%2C_Megaworld_Boulevard_%28Mandurriao%2C_Iloilo_City%3B_04-05-2024%29_%28cropped%29.jpg'
where name = 'Courtyard by Marriott Iloilo';

-- Shows condominium towers in Iloilo Business Park.
-- https://commons.wikimedia.org/wiki/File:Iloilo_Business_Park_north_condos_top_view_(Mandurriao,_Iloilo_City;_01-26-2023).jpg (CC BY-SA 4.0, Patrickroque01)
update accommodations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/2/21/Iloilo_Business_Park_north_condos_top_view_%28Mandurriao%2C_Iloilo_City%3B_01-26-2023%29.jpg/1280px-Iloilo_Business_Park_north_condos_top_view_%28Mandurriao%2C_Iloilo_City%3B_01-26-2023%29.jpg'
where name = 'The Belmont Hotel Iloilo';

-- Shows condominium towers in Iloilo Business Park.
-- https://commons.wikimedia.org/wiki/File:Condominiums_in_Iloilo_Business_Park.jpg (CC BY-SA 4.0, Merd123)
update accommodations
set photo_url = 'https://thumb.wikimedia.org/wikipedia/commons/thumb/5/5c/Condominiums_in_Iloilo_Business_Park.jpg/1280px-Condominiums_in_Iloilo_Business_Park.jpg'
where name = 'The Palladium';
