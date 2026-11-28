-- Raise the longest place description from 1000 to 3000 characters
-- (team request, 2026-11-28).
--
-- Why: admins now write descriptions in paragraphs on /admin/places, and the
-- place page shows them full width, so 1000 characters was too short.
--
-- What changes: only the description part of the two "text lengths" rules,
-- on destinations and on accommodations. Every other part of those rules is
-- copied exactly as it was (name 1-100, address 1-200, and for
-- accommodations phone <= 40 and email <= 120). A description may still be
-- empty (null) on old rows, and if it is given it still needs at least one
-- real character.
--
-- Safe to run on a database that has data: the new rule allows everything
-- the old one did, so no existing row can fail it. It only allows more, so
-- the website and backend that are live before this push keep working.

alter table public.destinations
  drop constraint destinations_text_lengths;

alter table public.destinations
  add constraint destinations_text_lengths check (
    char_length(btrim(name)) between 1 and 100
    and char_length(btrim(address)) between 1 and 200
    and (description is null or char_length(btrim(description)) between 1 and 3000)
  );

alter table public.accommodations
  drop constraint accommodations_text_lengths;

alter table public.accommodations
  add constraint accommodations_text_lengths check (
    char_length(btrim(name)) between 1 and 100
    and char_length(btrim(address)) between 1 and 200
    and (description is null or char_length(btrim(description)) between 1 and 3000)
    and (phone is null or char_length(phone) <= 40)
    and (email is null or char_length(email) <= 120)
  );

-- Check it worked (read-only): both rules should mention 3000.
-- select conrelid::regclass as table_name, pg_get_constraintdef(oid) as rule
-- from pg_constraint
-- where conname in ('destinations_text_lengths', 'accommodations_text_lengths');
