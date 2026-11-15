-- Place photos in their own table (admin extras round, ticket 143).
--
-- So a place can later have up to six photos (ticket 144), each with its own
-- credits, every place's photo moves into a new table, place_photos, as its
-- "photo 1" (the cover). Nothing changes for travelers or admins yet:
--
--   1. place_photos: one row per photo of a place (place_type + place_id,
--      like reviews: no foreign key, one column points at either table),
--      with its address and its position, 1 to 6 (1 is the cover).
--   2. Every place keeps its photo_url as a copy of its cover. The database
--      keeps them in step: setting a place's photo_url (adding a place,
--      "replace photo" on Edit) sets its photo 1. So everything that reads
--      photo_url today keeps working as it is.
--   3. Credits belong to a photo instead of a place: place_photo_credits
--      gets photo_id (its photo; one row per photo). Today's credits move
--      to each place's photo 1. place_type and place_id stay on the row,
--      for reading.
--   4. Deleting a place deletes its photos, and their credits with them.
--
-- Who may do what: only admins (is_admin()) may add, change or delete
-- photos; the backend's own login (lakat_api) and admins may read them.
-- Travelers get photos only through the backend, which leaves out the ones
-- whose credits are not allowed (ticket 138). Nothing here uses the
-- service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ----------------------------------------------------------------

create table if not exists public.place_photos (
    id uuid primary key default gen_random_uuid (),
    place_type text not null check (place_type in ('destination', 'accommodation')),
    place_id uuid not null,
    photo_url text not null check (char_length(photo_url) between 1 and 1000),
    position smallint not null check (position between 1 and 6),
    created_at timestamptz not null default now(),
    -- One photo per position; "deferrable" lets ticket 145 swap two
    -- positions in one step.
    constraint place_photos_one_per_position unique (place_type, place_id, position)
      deferrable initially immediate
);

create index if not exists place_photos_place on public.place_photos (place_type, place_id);

revoke all on public.place_photos from anon, authenticated;
grant select on public.place_photos to authenticated, lakat_api;
grant insert (place_type, place_id, photo_url, position) on public.place_photos to authenticated;
grant update (photo_url, position) on public.place_photos to authenticated;
grant delete on public.place_photos to authenticated;

alter table public.place_photos enable row level security;

drop policy if exists "admins can read place photos" on public.place_photos;
drop policy if exists "api can read place photos" on public.place_photos;
drop policy if exists "admins can add place photos" on public.place_photos;
drop policy if exists "admins can change place photos" on public.place_photos;
drop policy if exists "admins can delete place photos" on public.place_photos;

create policy "admins can read place photos" on public.place_photos for
select to authenticated using ((select public.is_admin ()));

create policy "api can read place photos" on public.place_photos for
select to lakat_api using (true);

create policy "admins can add place photos" on public.place_photos for
insert to authenticated with check ((select public.is_admin ()));

create policy "admins can change place photos" on public.place_photos for
update to authenticated using ((select public.is_admin ()))
with check ((select public.is_admin ()));

create policy "admins can delete place photos" on public.place_photos for
delete to authenticated using ((select public.is_admin ()));

-- 2. Today's photo of every place becomes its photo 1 --------------------------

insert into public.place_photos (place_type, place_id, photo_url, position)
select 'destination', d.id, d.photo_url, 1 from public.destinations d
 where d.photo_url is not null
   and not exists (select 1 from public.place_photos p
                    where p.place_type = 'destination' and p.place_id = d.id and p.position = 1);

insert into public.place_photos (place_type, place_id, photo_url, position)
select 'accommodation', a.id, a.photo_url, 1 from public.accommodations a
 where a.photo_url is not null
   and not exists (select 1 from public.place_photos p
                    where p.place_type = 'accommodation' and p.place_id = a.id and p.position = 1);

-- 3. A place's photo_url and its photo 1 stay in step --------------------------
--
-- TG_ARGV[0] is 'destination' or 'accommodation'. Runs as the person saving
-- the place (an admin), so the policies above decide too.

create or replace function public.place_cover_follows_photo_url()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.photo_url is null then
    return new;
  end if;
  update public.place_photos
     set photo_url = new.photo_url
   where place_type = tg_argv[0] and place_id = new.id and position = 1
     and photo_url is distinct from new.photo_url;
  if not exists (select 1 from public.place_photos
                  where place_type = tg_argv[0] and place_id = new.id and position = 1) then
    insert into public.place_photos (place_type, place_id, photo_url, position)
    values (tg_argv[0], new.id, new.photo_url, 1);
  end if;
  return new;
end;
$$;

revoke all on function public.place_cover_follows_photo_url() from public, anon;

drop trigger if exists destination_cover_follows_photo_url on public.destinations;
create trigger destination_cover_follows_photo_url
  after insert or update of photo_url on public.destinations
  for each row execute function public.place_cover_follows_photo_url('destination');

drop trigger if exists accommodation_cover_follows_photo_url on public.accommodations;
create trigger accommodation_cover_follows_photo_url
  after insert or update of photo_url on public.accommodations
  for each row execute function public.place_cover_follows_photo_url('accommodation');

-- 4. Deleting a place deletes its photos (and their credits, step 5) -----------

create or replace function public.delete_photos_of_place()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.place_photos where place_type = tg_argv[0] and place_id = old.id;
  return old;
end;
$$;

revoke all on function public.delete_photos_of_place() from public, anon;

drop trigger if exists destination_photos_go_with_it on public.destinations;
create trigger destination_photos_go_with_it
  after delete on public.destinations
  for each row execute function public.delete_photos_of_place('destination');

drop trigger if exists accommodation_photos_go_with_it on public.accommodations;
create trigger accommodation_photos_go_with_it
  after delete on public.accommodations
  for each row execute function public.delete_photos_of_place('accommodation');

-- 5. Credits belong to a photo -------------------------------------------------

alter table public.place_photo_credits
  add column if not exists photo_id uuid references public.place_photos (id) on delete cascade;

-- Today's credits move to each place's photo 1.
update public.place_photo_credits c
   set photo_id = p.id
  from public.place_photos p
 where c.photo_id is null
   and p.place_type = c.place_type and p.place_id = c.place_id and p.position = 1;

-- Credits of a place with no photo at all cannot belong anywhere (there
-- are none today: every place has a photo).
delete from public.place_photo_credits where photo_id is null;

alter table public.place_photo_credits alter column photo_id set not null;

-- One row per photo instead of one per place.
alter table public.place_photo_credits drop constraint if exists place_photo_credits_pkey;
alter table public.place_photo_credits add constraint place_photo_credits_pkey primary key (photo_id);

grant insert (photo_id) on public.place_photo_credits to authenticated;

-- 6. Check it worked ------------------------------------------------------------
--
-- Should say true (Row Level Security on):
--   select relrowsecurity from pg_class where relname = 'place_photos';
--
-- Should be the same two numbers (every place has its photo 1):
--   select (select count(*) from public.destinations) + (select count(*) from public.accommodations) as places,
--          (select count(*) from public.place_photos where position = 1) as covers;
--
-- Should be 0 (every credit belongs to a photo):
--   select count(*) from public.place_photo_credits where photo_id is null;
