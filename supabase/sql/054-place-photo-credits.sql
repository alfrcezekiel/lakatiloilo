-- Photo credits and copyright for place photos (photo credits round,
-- ticket 132).
--
-- On the dashboard's place form, below the photo, the team records who
-- took the photo, where it was published, a link to the original, its
-- copyright licence, whether we are allowed to use it, and the credit line
-- the site shows. This file adds the table that keeps them:
--
--   1. place_photo_credits: one row per place (place_type + place_id, like
--      reviews: no foreign key, because one column points at either
--      table). The database checks every field, and refuses "All rights
--      reserved" unless the status is "Permission from the owner".
--      for_photo_url keeps the photo the credits were saved for, so the
--      form can say "the photo was changed" when they no longer match.
--   2. Anyone may read the credits (they are meant to be public); only
--      admins (is_admin()) may add, change or delete them. updated_at and
--      updated_by are set by the database, never by the website.
--   3. Credits can only be saved for a place that exists, and deleting a
--      place deletes its credits (a trigger, like its reviews in 051). The
--      triggers run as the person acting (not "security definer"), so
--      Row Level Security decides there too.
--
-- Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ----------------------------------------------------------

create table if not exists public.place_photo_credits (
    place_type text not null check (place_type in ('destination', 'accommodation')),
    place_id uuid not null,
    photographer text not null check (char_length(btrim(photographer)) between 1 and 100),
    publisher text not null default '' check (char_length(publisher) <= 100),
    source_url text not null default '' check (
        source_url = '' or (source_url ~ '^https://[^\s]+$' and char_length(source_url) <= 500)
    ),
    licence text not null check (
        licence in ('cc_by_4', 'cc_by_sa_4', 'cc0', 'all_rights_reserved', 'own_photo', 'other')
    ),
    authorization_status text not null check (
        authorization_status in ('licence_allows', 'owner_permission', 'own_photo', 'not_checked')
    ),
    credit_line text not null check (char_length(btrim(credit_line)) between 1 and 200),
    for_photo_url text,
    updated_at timestamptz not null default now(),
    updated_by uuid references auth.users (id) on delete set null,
    primary key (place_type, place_id),
    -- The copyright check: a photo nobody may reuse needs its owner's yes.
    constraint all_rights_reserved_needs_permission check (
        licence <> 'all_rights_reserved' or authorization_status = 'owner_permission'
    )
);

-- 2. What website users and the backend may touch at all -------------------

revoke all on public.place_photo_credits from anon, authenticated;

grant select on public.place_photo_credits to anon, authenticated, lakat_api;
-- Not updated_at or updated_by: the trigger below sets them.
grant insert (
    place_type, place_id, photographer, publisher, source_url, licence,
    authorization_status, credit_line, for_photo_url
) on public.place_photo_credits to authenticated;
grant update (
    photographer, publisher, source_url, licence, authorization_status,
    credit_line, for_photo_url
) on public.place_photo_credits to authenticated;
grant delete on public.place_photo_credits to authenticated;

-- 3. Row Level Security -----------------------------------------------------

alter table public.place_photo_credits enable row level security;

drop policy if exists "anyone can read photo credits" on public.place_photo_credits;
drop policy if exists "api can read photo credits" on public.place_photo_credits;
drop policy if exists "admins can add photo credits" on public.place_photo_credits;
drop policy if exists "admins can change photo credits" on public.place_photo_credits;
drop policy if exists "admins can delete photo credits" on public.place_photo_credits;

create policy "anyone can read photo credits" on public.place_photo_credits for
select to anon, authenticated using (true);

create policy "api can read photo credits" on public.place_photo_credits for
select to lakat_api using (true);

create policy "admins can add photo credits" on public.place_photo_credits for
insert to authenticated with check ((select public.is_admin ()));

create policy "admins can change photo credits" on public.place_photo_credits for
update to authenticated using ((select public.is_admin ()))
with check ((select public.is_admin ()));

create policy "admins can delete photo credits" on public.place_photo_credits for
delete to authenticated using ((select public.is_admin ()));

-- 4. Only for a place that exists; who saved it and when --------------------

create or replace function public.place_photo_credits_before_save()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and not (
       (new.place_type = 'destination'
          and exists (select 1 from public.destinations d where d.id = new.place_id))
    or (new.place_type = 'accommodation'
          and exists (select 1 from public.accommodations a where a.id = new.place_id))
  ) then
    raise exception 'That place does not exist.' using errcode = '23503';
  end if;
  new.updated_at := now();
  new.updated_by := auth.uid();
  return new;
end;
$$;

revoke all on function public.place_photo_credits_before_save() from public, anon;

drop trigger if exists place_photo_credits_before_save on public.place_photo_credits;

create trigger place_photo_credits_before_save
  before insert or update on public.place_photo_credits
  for each row execute function public.place_photo_credits_before_save();

-- 5. A place's credits go with it -------------------------------------------
--
-- TG_ARGV[0] is 'destination' or 'accommodation'.

create or replace function public.delete_credits_of_place()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.place_photo_credits
   where place_type = tg_argv[0] and place_id = old.id;
  return old;
end;
$$;

revoke all on function public.delete_credits_of_place() from public, anon;

drop trigger if exists destination_credits_go_with_it on public.destinations;

create trigger destination_credits_go_with_it
  after delete on public.destinations
  for each row execute function public.delete_credits_of_place('destination');

drop trigger if exists accommodation_credits_go_with_it on public.accommodations;

create trigger accommodation_credits_go_with_it
  after delete on public.accommodations
  for each row execute function public.delete_credits_of_place('accommodation');

-- 6. Check it worked ------------------------------------------------------------
--
-- Should say true (Row Level Security on):
--   select relrowsecurity from pg_class where relname = 'place_photo_credits';
--
-- Should list five policies (two SELECT, INSERT, UPDATE, DELETE):
--   select policyname, cmd from pg_policies where tablename = 'place_photo_credits';
--
-- Should list three triggers:
--   select tgrelid::regclass, tgname from pg_trigger
--    where tgname in ('place_photo_credits_before_save',
--                     'destination_credits_go_with_it',
--                     'accommodation_credits_go_with_it');
