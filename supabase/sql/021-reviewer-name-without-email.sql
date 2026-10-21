-- Reviewer names never come from an email address (code review of the
-- reviews and ratings round, 2026-10-21).
--
-- Before: an account with no display name was shown on its reviews as the
-- part of its email before the @ ("juan.delacruz" from
-- juan.delacruz@example.com). The spec says email addresses are never
-- shown, so now such an account is shown as "Traveler".
-- Also: display names are cut to 40 characters here in the database. The
-- sign-up page already asks for 2 to 40, but someone could create an
-- account through Supabase's API without using the page.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The same trigger function as in 020, with the new name rule -------

create or replace function public.reviews_before_write()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.place_type = 'destination'
       and not exists (select 1 from public.destinations where id = new.place_id) then
      raise exception 'That destination does not exist';
    elsif new.place_type = 'accommodation'
       and not exists (select 1 from public.accommodations where id = new.place_id) then
      raise exception 'That accommodation does not exist';
    end if;
    new.created_at := now();
  end if;

  -- The display name, trimmed and cut to 40 characters, or "Traveler".
  select coalesce(
           nullif(left(btrim(u.raw_user_meta_data ->> 'display_name'), 40), ''),
           'Traveler'
         )
    into new.reviewer_name
    from auth.users u
   where u.id = new.user_id;

  new.updated_at := now();
  return new;
end;
$$;

-- 2. Fix the names on reviews that already exist -----------------------
--
-- The trigger is paused for this one update so the reviews keep their
-- real "last edited" time; only the shown name changes.

alter table public.reviews disable trigger reviews_before_write;

update public.reviews r
   set reviewer_name = coalesce(
         nullif(left(btrim(u.raw_user_meta_data ->> 'display_name'), 40), ''),
         'Traveler'
       )
  from auth.users u
 where u.id = r.user_id;

alter table public.reviews enable trigger reviews_before_write;

-- 3. Check it worked -------------------------------------------------
--
-- This should list every reviewer name; none should look like the start
-- of an email address:
--   select distinct reviewer_name from public.reviews;
