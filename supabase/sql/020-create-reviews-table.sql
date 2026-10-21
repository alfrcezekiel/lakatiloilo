-- Reviews and ratings (ticket 39).
--
-- Travelers with an account give a destination or accommodation 1 to 5
-- stars and a short comment. Everyone, logged in or not, can read them.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The table ------------------------------------------------------

create table if not exists public.reviews (
    id uuid primary key default gen_random_uuid (),
    -- Which place is reviewed: a row in destinations or in accommodations.
    place_type text not null check (
        place_type in (
            'destination',
            'accommodation'
        )
    ),
    place_id uuid not null,
    -- The account that wrote it. Filled in by Supabase from the login, so
    -- nobody can write a review "as" someone else.
    user_id uuid not null default auth.uid () references auth.users (id) on delete cascade,
    -- Copied from the account's display name by the trigger below.
    reviewer_name text not null default '',
    rating smallint not null check (rating between 1 and 5),
    comment text not null check (
        char_length(btrim (comment)) between 1 and 500
    ),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),
    -- One review per account per place.
    unique (user_id, place_type, place_id)
);

-- Makes "all reviews for this place, newest first" fast.
create index if not exists reviews_place_idx on public.reviews (
    place_type,
    place_id,
    created_at desc
);

-- 2. Filled in by the database, not by the browser -------------------
--
-- Runs before every new or edited review:
--   - checks the place really exists,
--   - copies the reviewer's display name from their account,
--   - sets created_at / updated_at.
-- "security definer" lets it read the account (auth.users), which normal
-- website users cannot see. search_path = '' and full table names stop
-- anyone from tricking it into using a look-alike table.

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

  select coalesce(
           nullif(btrim(u.raw_user_meta_data ->> 'display_name'), ''),
           split_part(u.email, '@', 1),
           'Traveler'
         )
    into new.reviewer_name
    from auth.users u
   where u.id = new.user_id;

  new.updated_at := now();
  return new;
end;
$$;

create trigger reviews_before_write
  before insert or update on public.reviews
  for each row execute function public.reviews_before_write();

-- 3. What website users may touch at all -------------------------------
--
-- By default Supabase lets website users (anon = logged out,
-- authenticated = logged in) try anything on a new table, and leaves the
-- rest to Row Level Security. Here we narrow it down first:
--   - anyone may read,
--   - logged-in travelers may add a review, choosing only the place, the
--     stars and the comment (user_id, name and dates are set for them),
--   - they may edit only the stars and the comment (a review can never be
--     moved to another place or handed to another account),
--   - they may delete.

revoke all on public.reviews from anon, authenticated;

grant select on public.reviews to anon, authenticated;

grant
insert (
        place_type,
        place_id,
        rating,
        comment
    ) on public.reviews to authenticated;

grant update (rating, comment) on public.reviews to authenticated;

grant delete on public.reviews to authenticated;

-- 4. Row Level Security --------------------------------------------
--
-- The rules for WHICH rows each person may read, add, edit or delete.
-- Anything without a policy is refused.

alter table public.reviews enable row level security;

create policy "anyone can read reviews" on public.reviews for
select to anon, authenticated using (true);

create policy "travelers can add their own reviews" on public.reviews for
insert
    to authenticated
with
    check (
        (
            select auth.uid ()
        ) = user_id
    );

create policy "authors can edit their own reviews" on public.reviews for
update to authenticated using (
    (
        select auth.uid ()
    ) = user_id
)
with
    check (
        (
            select auth.uid ()
        ) = user_id
    );

create policy "authors can delete their own reviews" on public.reviews for delete to authenticated using (
    (
        select auth.uid ()
    ) = user_id
);

-- 5. Check it worked -------------------------------------------------
--
-- Table Editor -> reviews should NOT show an "RLS disabled" warning, and
-- Authentication -> Policies should list the four policies above.