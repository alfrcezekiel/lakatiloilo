-- Auto-hide at 3 reports (admin dashboard & moderation round, ticket
-- 110).
--
-- When 3 different travelers have reported a review, the database hides it
-- by itself, the same way as the team's Hide it (040): it disappears from
-- the place page, the ratings and public profiles; its writer sees "Hidden
-- while the team reviews it."; it shows as Hidden on the Reports screen
-- until the team presses Keep it (which removes the reports and shows it
-- again) or Delete review. Open pages hear about it at once through the
-- signal table (041).
--
-- "Different travelers": a traveler can report a review only once (the
-- unique rule in 026), so 3 reports are always 3 different accounts.
--
-- How:
--   1. A trigger on review_reports runs after each new report and hides
--      the review when it has 3 or more reports and is not hidden yet.
--   2. The review guard from 040 normally lets only admins change
--      hidden_at. It now also allows hiding (never showing) a review that
--      really has 3 or more reports, counted by the database itself, so
--      the traveler sending the third report can trigger it, and nobody can
--      fake it.
--
-- Safety: Row Level Security is unchanged. The trigger function runs as
-- security definer only to hide that one review, with search_path = ''
-- and full table names. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The review guard (the same as 040, plus the auto-hide case) ----------

create or replace function public.reviews_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' then
    -- Auto-hide (ticket 110): hiding a review that really has 3 or more
    -- reports is allowed for anyone, because the database counts them
    -- itself here. Showing it again is still for admins only.
    if new.hidden_at is distinct from old.hidden_at
       and not public.is_admin()
       and not (
         old.hidden_at is null
         and new.hidden_at is not null
         and (select count(*) from public.review_reports rr where rr.review_id = old.id) >= 3
       ) then
      raise exception 'Only the Lakat Iloilo team can hide or show a review'
        using errcode = '42501';
    end if;
    if (select auth.uid()) is distinct from old.user_id
       and public.is_admin()
       and (new.rating is distinct from old.rating
            or new.comment is distinct from old.comment
            or new.photo_path is distinct from old.photo_path) then
      raise exception 'The team can hide or delete a review, not change it'
        using errcode = '42501';
    end if;
  end if;

  if new.photo_path is not null
     and split_part(new.photo_path, '/', 1) <> new.user_id::text then
    raise exception 'That photo is not yours'
      using errcode = '42501';
  end if;

  if tg_op = 'INSERT' then
    if new.place_type = 'destination'
       and not exists (select 1 from public.destinations where id = new.place_id) then
      raise exception 'That destination does not exist';
    elsif new.place_type = 'accommodation'
       and not exists (select 1 from public.accommodations where id = new.place_id) then
      raise exception 'That accommodation does not exist';
    end if;
    new.created_at := now();
    -- A new review is never hidden.
    new.hidden_at := null;
  end if;

  select public.public_name_of(u.raw_user_meta_data),
         case
           when u.raw_user_meta_data ->> 'traveler_type' in ('local', 'domestic', 'foreign')
             then u.raw_user_meta_data ->> 'traveler_type'
         end
    into new.reviewer_name, new.traveler_type
    from auth.users u
   where u.id = new.user_id;

  if tg_op = 'INSERT'
     or new.rating is distinct from old.rating
     or new.comment is distinct from old.comment
     or new.photo_path is distinct from old.photo_path then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

-- 2. Hide at the third report ----------------------------------------------

create or replace function public.hide_review_at_three_reports()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if (select count(*) from public.review_reports where review_id = new.review_id) >= 3 then
    update public.reviews
       set hidden_at = now()
     where id = new.review_id
       and hidden_at is null;
  end if;
  return null;
end;
$$;

revoke all on function public.hide_review_at_three_reports() from public, anon, authenticated;

drop trigger if exists hide_review_at_three_reports on public.review_reports;

create trigger hide_review_at_three_reports
  after insert on public.review_reports
  for each row execute function public.hide_review_at_three_reports();

-- 3. Check it worked ----------------------------------------------------------
--
-- Should list the new trigger on review_reports:
--   select tgname from pg_trigger
--    where tgrelid = 'public.review_reports'::regclass and not tgisinternal;
--
-- Reviews that already have 3 or more reports are not hidden by this file
-- (only a new report triggers it). To see them:
--   select review_id, count(*) from public.review_reports
--    group by review_id having count(*) >= 3;
