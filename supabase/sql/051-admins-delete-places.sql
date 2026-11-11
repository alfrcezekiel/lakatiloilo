-- Admins may delete places (full admin management round, ticket 121).
--
-- "Delete place" on the dashboard's Edit form removes a destination or an
-- accommodation for good, after a "Yes, delete" step that says how many
-- reviews go with it.
--
-- Reviews point at their place with place_type and place_id (no foreign
-- key, because one column can point at either table). So this file adds a
-- trigger: when a place is deleted, its reviews are deleted in the same
-- step. Each review then takes its replies, Helpful likes, reports,
-- photo rows and notifications with it (those already have
-- "on delete cascade"). The backend deletes the photo files themselves
-- from Storage afterwards (place-photos, 049; review-photos, 040), as the
-- admin.
--
-- Who may do what: only admins may delete a place (a new Row Level
-- Security policy that asks is_admin()); travelers still cannot. The
-- trigger runs as the person deleting (not "security definer"), so the
-- reviews' own rules decide too: admins may delete any review (040).
-- Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Admins may delete a place -----------------------------------------------

grant delete on public.destinations to authenticated;
grant delete on public.accommodations to authenticated;

drop policy if exists "admins can delete destinations" on public.destinations;

create policy "admins can delete destinations" on public.destinations for
delete to authenticated using ((select public.is_admin ()));

drop policy if exists "admins can delete accommodations" on public.accommodations;

create policy "admins can delete accommodations" on public.accommodations for
delete to authenticated using ((select public.is_admin ()));

-- 2. A place's reviews go with it ---------------------------------------------
--
-- TG_ARGV[0] is 'destination' or 'accommodation', the review's place_type.

create or replace function public.delete_reviews_of_place()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  delete from public.reviews
   where place_type = tg_argv[0] and place_id = old.id;
  return old;
end;
$$;

revoke all on function public.delete_reviews_of_place() from public, anon;

drop trigger if exists destination_reviews_go_with_it on public.destinations;

create trigger destination_reviews_go_with_it
  after delete on public.destinations
  for each row execute function public.delete_reviews_of_place('destination');

drop trigger if exists accommodation_reviews_go_with_it on public.accommodations;

create trigger accommodation_reviews_go_with_it
  after delete on public.accommodations
  for each row execute function public.delete_reviews_of_place('accommodation');

-- 3. Check it worked ------------------------------------------------------------
--
-- Should list a DELETE policy for each table:
--   select tablename, policyname, cmd from pg_policies
--    where tablename in ('destinations', 'accommodations') and cmd = 'DELETE';
--
-- Should list both new triggers:
--   select tgrelid::regclass, tgname from pg_trigger where tgname like '%reviews_go_with_it';
