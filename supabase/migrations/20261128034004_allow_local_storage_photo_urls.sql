-- Allow place photos stored by the LOCAL Supabase stack.
--
-- Why: destinations and accommodations only accepted photo addresses that
-- start with https://. The hosted projects serve storage over https, but the
-- local stack (npx supabase start) serves it from http://127.0.0.1:54321, so
-- every place saved locally with an uploaded photo was refused with
-- "violates check constraint destinations_photo_url_https".
--
-- What changes: the same rule (empty, or at most 500 characters and https://),
-- plus exactly two extra addresses: the local stack's public storage path on
-- 127.0.0.1 and on localhost. No other http:// address is allowed. On staging
-- and production the backend still builds https:// addresses only.
--
-- Each constraint is dropped and re-added in one migration, so it runs in one
-- transaction: the tables are never left without the rule.

alter table public.destinations
  drop constraint destinations_photo_url_https;

alter table public.destinations
  add constraint destinations_photo_url_https check (
    photo_url is null
    or (
      char_length(photo_url) <= 500
      and (
        photo_url like 'https://%'
        or photo_url like 'http://127.0.0.1:54321/storage/v1/object/public/%'
        or photo_url like 'http://localhost:54321/storage/v1/object/public/%'
      )
    )
  );

alter table public.accommodations
  drop constraint accommodations_photo_url_https;

alter table public.accommodations
  add constraint accommodations_photo_url_https check (
    photo_url is null
    or (
      char_length(photo_url) <= 500
      and (
        photo_url like 'https://%'
        or photo_url like 'http://127.0.0.1:54321/storage/v1/object/public/%'
        or photo_url like 'http://localhost:54321/storage/v1/object/public/%'
      )
    )
  );

-- Checks the team can run (SQL Editor or psql) to see it worked:
--
-- select conrelid::regclass as table_name, conname, pg_get_constraintdef(oid)
-- from pg_constraint
-- where conname in ('destinations_photo_url_https', 'accommodations_photo_url_https');