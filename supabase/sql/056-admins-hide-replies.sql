-- Admins may hide a reply, and show it again (admin extras round,
-- ticket 140).
--
-- On the dashboard's Reviews screen, each reply gets "Hide it" beside
-- Delete. A hidden reply stays in its thread, so the answers under it stay
-- too, but travelers see "This reply was hidden by the Lakat Iloilo team."
-- instead of its text. Its writer still sees their own text, marked as
-- hidden. "Show it" puts the text back exactly as it was.
--
-- How the text is kept safe while hidden:
--   1. review_replies gets hidden_at (when it was hidden, empty otherwise).
--   2. The text moves into a new table, reply_hidden_texts, which only
--      admins and the backend's own login (lakat_api) may read; the reply
--      itself keeps an empty text. So nobody can read a hidden reply's text
--      through the site's public key, as they can read every reply. The
--      backend shows it only to the reply's writer and to admins.
--   3. Hiding and showing go through two functions, admin_hide_reply and
--      admin_show_reply, that refuse anyone who is not an admin
--      (is_admin(), 038). Nobody may write reply_hidden_texts directly.
--   4. A hidden reply cannot be edited or marked Helpful (like a deleted
--      one, 034). It can still be answered. Hiding or showing never marks
--      it "edited".
--   5. If the writer deletes a hidden reply, its hidden text goes too.
--
-- Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. When a reply was hidden ------------------------------------------------

alter table public.review_replies
  add column if not exists hidden_at timestamptz;

-- A hidden reply has an empty text, like a deleted one (034), so the 1 to
-- 300 character rule applies only to replies that are neither.
alter table public.review_replies
  drop constraint if exists review_replies_comment_check;
alter table public.review_replies
  add constraint review_replies_comment_check check (
    deleted_at is not null
    or hidden_at is not null
    or char_length(btrim(comment)) between 1 and 300
  );

-- 2. Where a hidden reply's text waits ---------------------------------------

create table if not exists public.reply_hidden_texts (
    reply_id uuid primary key references public.review_replies (id) on delete cascade,
    comment text not null,
    hidden_by uuid references auth.users (id) on delete set null,
    hidden_at timestamptz not null default now()
);

revoke all on public.reply_hidden_texts from anon, authenticated;
grant select on public.reply_hidden_texts to authenticated, lakat_api;

alter table public.reply_hidden_texts enable row level security;

drop policy if exists "admins can read hidden reply texts" on public.reply_hidden_texts;
drop policy if exists "api can read hidden reply texts" on public.reply_hidden_texts;

create policy "admins can read hidden reply texts" on public.reply_hidden_texts for
select to authenticated using ((select public.is_admin ()));

create policy "api can read hidden reply texts" on public.reply_hidden_texts for
select to lakat_api using (true);

-- 3. Hiding and showing (admins only) ----------------------------------------
--
-- Each answers 'hidden' / 'shown', or null when there is no such reply (or
-- it is deleted). Hiding an already hidden reply, or showing a shown one,
-- changes nothing and answers the same word.

create or replace function public.admin_hide_reply(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_reply record;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may hide replies.' using errcode = '42501';
  end if;
  select id, comment, hidden_at, deleted_at into found_reply
    from public.review_replies where id = target for update;
  if found_reply.id is null or found_reply.deleted_at is not null then
    return null;
  end if;
  if found_reply.hidden_at is not null then
    return 'hidden';
  end if;
  insert into public.reply_hidden_texts (reply_id, comment, hidden_by)
  values (target, found_reply.comment, auth.uid());
  update public.review_replies set comment = '', hidden_at = now() where id = target;
  return 'hidden';
end;
$$;

create or replace function public.admin_show_reply(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  found_reply record;
  saved_text text;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may show replies.' using errcode = '42501';
  end if;
  select id, hidden_at, deleted_at into found_reply
    from public.review_replies where id = target for update;
  if found_reply.id is null or found_reply.deleted_at is not null then
    return null;
  end if;
  if found_reply.hidden_at is null then
    return 'shown';
  end if;
  delete from public.reply_hidden_texts where reply_id = target returning comment into saved_text;
  update public.review_replies
     set comment = coalesce(saved_text, ''), hidden_at = null
   where id = target;
  return 'shown';
end;
$$;

revoke all on function public.admin_hide_reply(uuid) from public, anon;
revoke all on function public.admin_show_reply(uuid) from public, anon;
grant execute on function public.admin_hide_reply(uuid) to authenticated;
grant execute on function public.admin_show_reply(uuid) to authenticated;

-- 4. Hiding or showing never marks a reply "edited" --------------------------
--
-- The same as 031, except a change of hidden_at keeps updated_at as it was.

create or replace function public.review_replies_before_update()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.hidden_at is distinct from old.hidden_at then
    new.updated_at := old.updated_at;
  elsif new.comment is distinct from old.comment then
    new.updated_at := now();
  else
    new.updated_at := old.updated_at;
  end if;
  return new;
end;
$$;

-- 5. A hidden reply cannot be edited or marked Helpful -----------------------
--
-- The same as 034, plus: not hidden.

drop policy if exists "repliers can edit their own replies" on public.review_replies;
create policy "repliers can edit their own replies"
  on public.review_replies for update
  to authenticated
  using ((select auth.uid ()) = user_id and deleted_at is null and hidden_at is null)
  with check ((select auth.uid ()) = user_id and deleted_at is null and hidden_at is null);

drop policy if exists "travelers can like other travelers' replies" on public.reply_likes;
create policy "travelers can like other travelers' replies" on public.reply_likes for
insert
    to authenticated
with
    check (
        (select auth.uid ()) = user_id
        and exists (
            select 1
              from public.review_replies r
             where r.id = reply_id
               and r.user_id <> (select auth.uid ())
               and r.deleted_at is null
               and r.hidden_at is null
        )
    );

-- 6. A deleted reply keeps no hidden text ------------------------------------
--
-- delete_own_reply (034, 037) blanks a reply that has answers and sets
-- deleted_at; then its waiting text goes too. (A reply removed completely
-- takes it with it through "on delete cascade".)

create or replace function public.forget_hidden_text_of_deleted_reply()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  delete from public.reply_hidden_texts where reply_id = new.id;
  new.hidden_at := null;
  return new;
end;
$$;

revoke all on function public.forget_hidden_text_of_deleted_reply() from public, anon;

drop trigger if exists review_replies_forget_hidden_text on public.review_replies;

create trigger review_replies_forget_hidden_text
  before update of deleted_at on public.review_replies
  for each row
  when (new.deleted_at is not null and old.deleted_at is null)
  execute function public.forget_hidden_text_of_deleted_reply();

-- 7. Check it worked ------------------------------------------------------------
--
-- Should say true (Row Level Security on):
--   select relrowsecurity from pg_class where relname = 'reply_hidden_texts';
--
-- Should list both functions:
--   select proname from pg_proc where proname in ('admin_hide_reply', 'admin_show_reply');
--
-- Should list the hidden_at column:
--   select column_name from information_schema.columns
--    where table_name = 'review_replies' and column_name = 'hidden_at';
