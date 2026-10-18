-- Fix accommodation phone numbers and emails.
--
-- The contact details from 005 were sample data: none of them matched any
-- published listing. Now that the "Call" and "Email" buttons really dial and
-- send, a tester could reach a stranger. So:
--
--   * Where two or more public listings agree, use those details.
--   * Where nothing reliable was found, set the field to NULL. The page hides
--     the Call / Email button and the contact line when a field is NULL.
--
-- Sources are third-party listings (travel sites, conference pages), looked
-- up on 2026-10-19, not the hotels' own websites. Confirm each by phone
-- before the demo.
--
-- Safe to run more than once.

-- Hotel del Rio: phone and email agree across several listings.
update accommodations
set phone = '+63 33 335 1171',
    email = 'hoteldelrio@gmail.com'
where name = 'Hotel del Rio';

-- Grand Xing Imperial Hotel: landline and email agree across listings.
update accommodations
set phone = '+63 33 337 0791',
    email = 'fo_gxih@yahoo.com'
where name = 'Grand Xing Imperial Hotel';

-- Seda Atria: phone agrees across listings; email only had one source.
update accommodations
set phone = '+63 33 506 8888',
    email = null
where name = 'Seda Atria';

-- Richmond Hotel: the real name is "Richmonde Hotel Iloilo". Phone agrees
-- across listings; the email differs between sources, so leave it out.
update accommodations
set name = 'Richmonde Hotel Iloilo',
    phone = '+63 33 328 7888',
    email = null
where name in ('Richmond Hotel', 'Richmonde Hotel Iloilo');

-- Injap Tower Hotel: email agrees across two listings; the phone number
-- only had one source.
update accommodations
set phone = null,
    email = 'iloilo@injaptowerhotel.com.ph'
where name = 'Injap Tower Hotel';

-- No contact details found anywhere. These places may not exist under
-- these names; the team should check them or replace them with real places.
update accommodations
set phone = null,
    email = null
where name in ('Sheraton Iloilo', 'Citi Residences', 'The Venue');

-- Check: one row per accommodation with its new contact details.
select name, phone, email from accommodations order by name;
