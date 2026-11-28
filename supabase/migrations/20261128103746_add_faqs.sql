-- Adds the faqs table: the home page's "Frequently asked questions"
-- (FAQs round, team request 2026-11-28; ticket 168).
--
-- Why: travelers new to Iloilo or to Lakat Iloilo keep asking the same few
-- things. The Lakat Iloilo team writes the questions and answers on
-- /admin/faqs, and the home page shows the ones the team ticks to show.
--
-- What it adds:
--   - the faqs table: question (1-150 characters), answer (1-1000), topic
--     (one of three), position (its order inside its topic), is_shown
--     (false for a new question), created_at, updated_at;
--   - Row Level Security: anyone may read the shown questions; only admins
--     (is_admin()) may read the hidden ones, and add, edit and delete;
--     the backend's lakat_api login may read the shown ones only (the admin
--     screen reads as the signed-in admin, so the database decides);
--   - a rule that at most 12 questions are shown at once;
--   - 10 starter questions, all hidden, so the live site has them too
--     (seed.sql never runs on production). The team reads and corrects each
--     one on /admin/faqs before ticking it to show.
--
-- Safe on a database with data: it only adds a new table.

create table public.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  topic text not null,
  position integer not null,
  is_shown boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint faqs_question_length check (char_length(btrim(question)) between 1 and 150),
  constraint faqs_answer_length check (char_length(btrim(answer)) between 1 and 1000),
  constraint faqs_topic_check check (topic in ('new_to_iloilo', 'about_platform', 'finding_places')),
  constraint faqs_position_check check (position >= 1),
  -- Two questions never share a place in one topic. Checked at the end of
  -- the transaction, so Move up / Move down can swap two of them.
  constraint faqs_topic_position_once unique (topic, position) deferrable initially deferred
);

comment on table public.faqs is
  'Frequently asked questions on the home page (ticket 168). Written by admins on /admin/faqs; at most 12 shown.';

create trigger update_faqs_updated_at
  before update on public.faqs
  for each row
  execute function public.update_updated_at_column();

-- At most 12 shown at once (spec, FAQs round). Runs as the table's owner
-- so it counts every shown question, and takes a lock for the rest of the
-- transaction, so two admins ticking "show" at the same moment cannot both
-- get past 12.
create or replace function public.faqs_at_most_12_shown()
  returns trigger
  language plpgsql
  security definer
  set search_path to ''
  as $function$
begin
  if new.is_shown then
    perform pg_advisory_xact_lock(hashtext('public.faqs shown'));
    if (select count(*) from public.faqs f where f.is_shown and f.id <> new.id) >= 12 then
      raise exception 'Only 12 questions can show at once. Hide one first.'
        using errcode = '23514', constraint = 'faqs_at_most_12_shown';
    end if;
  end if;
  return new;
end;
$function$;

revoke all on function public.faqs_at_most_12_shown() from public, anon, authenticated;

create trigger faqs_at_most_12_shown
  before insert or update of is_shown on public.faqs
  for each row
  execute function public.faqs_at_most_12_shown();

-- Row Level Security.
alter table public.faqs enable row level security;

create policy "anyone can read shown faqs" on public.faqs
  for select
  to anon, authenticated
  using (is_shown);

create policy "admins can read every faq" on public.faqs
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "admins can add faqs" on public.faqs
  for insert
  to authenticated
  with check ((select public.is_admin()));

create policy "admins can edit faqs" on public.faqs
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "admins can delete faqs" on public.faqs
  for delete
  to authenticated
  using ((select public.is_admin()));

create policy "api can read shown faqs" on public.faqs
  for select
  to lakat_api
  using (is_shown);

-- Table rights: Supabase gives new tables broad default rights, so take
-- them all away and grant only what each role needs. Admins write through
-- the authenticated role (the policies above stop everyone else); id,
-- created_at and updated_at are filled in by the database.
revoke all on table public.faqs from anon, authenticated, lakat_api;
grant select on table public.faqs to anon;
grant select, delete on table public.faqs to authenticated;
grant insert (question, answer, topic, position, is_shown) on table public.faqs to authenticated;
grant update (question, answer, topic, position, is_shown) on table public.faqs to authenticated;
grant select on table public.faqs to lakat_api;

-- The 10 starter questions, hidden. Written for the team to check: they
-- describe Lakat Iloilo as it is on 2026-11-28.
insert into public.faqs (topic, position, question, answer) values
  ('new_to_iloilo', 1,
   'What''s the difference between Iloilo City and Iloilo Province?',
   'Iloilo City is the busy, walkable city: food spots, heritage houses, the Esplanade and the business districts.

Iloilo Province is everything around it: mountain towns, beaches, old churches and farms, usually an hour or more away by road.

Use the All / Iloilo City / Iloilo Province buttons on the home page to see only the places in one of them.'),
  ('new_to_iloilo', 2,
   'When is a good time to visit?',
   'The drier months, from about December to May, are the easiest for beaches, hikes and long drives. From about June to October it rains more, and mountain trails can be slippery.

Festivals have their own dates, such as Dinagyang in Iloilo City every January. Check a festival''s page and its organisers for this year''s schedule before you book.'),
  ('new_to_iloilo', 3,
   'How do I get to a place I found here?',
   'Open the place and scroll to its map. It shows where the place is, and "Get directions" opens the route in your maps app.

You can also press "Route from my location" to preview the road route from where you are. Lakat Iloilo only asks for your location when you press it.'),
  ('about_platform', 1,
   'What is Lakat Iloilo?',
   'Lakat Iloilo puts Iloilo''s destinations and places to stay on one website, instead of scattered across social media pages and search results.

Every place has its address, photos, a map and reviews from other travelers, so you can plan a trip in one place.'),
  ('about_platform', 2,
   'Do I need an account?',
   'No, not to look around. You can browse, search and read every place and review without logging in.

You need a free account only to write a review, reply to one or mark one Helpful.'),
  ('about_platform', 3,
   'Is it free?',
   'Yes. Browsing, searching and writing reviews are all free.

Lakat Iloilo does not sell bookings or tickets. To stay at a hotel or condominium, contact it directly with the phone number or email on its page.'),
  ('about_platform', 4,
   'How do I write a review?',
   'Log in (or create an account), open the place, and scroll to Reviews. Pick your stars, write what you thought, and add up to 4 photos or one short video if you like.

You can edit or delete your own review at any time.'),
  ('finding_places', 1,
   'How do I find places by category or area?',
   'Type a name or town in "Where to?" at the top of the home page, or pick a category chip such as Mountains or Hotels.

Further down, the category cards take you straight to each list, and the All / Iloilo City / Iloilo Province buttons narrow every list to one area.'),
  ('finding_places', 2,
   'How do you keep place details accurate?',
   'The Lakat Iloilo team checks and updates every place''s name, address, contact details and photos from our dashboard.

Photos are shown only once their owner is credited and we are allowed to use them, and every review is from a traveler who logged in. If something looks wrong, mention it in a review so the team and other travelers see it.'),
  ('finding_places', 3,
   'What do the star ratings mean?',
   'A place''s stars are the average of its travelers'' reviews, from 1 to 5, with the number of reviews next to them.

A place with only a few reviews can move a lot with each new one, so read the reviews too.');

-- Check queries (run in the local database to see it worked):
-- select topic, position, is_shown, question from public.faqs order by topic, position;   -- 10 rows, all hidden
-- select policyname, roles, cmd from pg_policies where tablename = 'faqs' order by policyname;   -- 6 policies
-- select relrowsecurity from pg_class where oid = 'public.faqs'::regclass;   -- true
