-- Lets a FAQ have a topic the team types (FAQs round, ticket 173; team
-- request 2026-11-28: an "Other" choice in the topic list, with a box for
-- a new topic).
--
-- Why: until now a question's topic had to be one of the three built-in
-- ones (new_to_iloilo, about_platform, finding_places). The team wants to
-- add their own, such as "Beaches" or "Festivals".
--
-- What it changes: the topic rule. A topic is still one of the three
-- built-in ids, OR a name the team typed: 2 to 40 characters, with no
-- spaces at either end and no line breaks or tabs. Nothing else changes:
-- Row Level Security, the policies, the table rights and the 12-shown rule
-- stay as they are (20261128103746_add_faqs.sql).
--
-- Safe on a database with data: every topic already saved is a built-in
-- id, which the new rule still accepts.

alter table public.faqs drop constraint faqs_topic_check;

alter table public.faqs add constraint faqs_topic_check check (
  topic in ('new_to_iloilo', 'about_platform', 'finding_places')
  or (
    topic = btrim(topic)
    and char_length(topic) between 2 and 40
    and topic !~ '[[:cntrl:]]'
  )
);

-- Check queries (run in the local database to see it worked):
-- select pg_get_constraintdef(oid) from pg_constraint where conname = 'faqs_topic_check';
-- begin; insert into public.faqs (question, answer, topic, position) values ('Q?', 'A.', 'Beaches', 1); rollback;   -- works
-- begin; insert into public.faqs (question, answer, topic, position) values ('Q?', 'A.', ' x', 1); rollback;        -- refused
