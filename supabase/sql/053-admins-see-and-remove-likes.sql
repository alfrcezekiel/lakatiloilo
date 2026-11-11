-- Admins see who marked a review or reply Helpful, and may remove a like
-- (full admin management round, ticket 125).
--
-- On the dashboard's Reviews screen, a review's or reply's "N Helpful"
-- opens the list of travelers who marked it, each with "Remove".
--
--   1. Admins may delete any Helpful like (a new Row Level Security policy
--      that asks is_admin(), 038). Travelers still may only remove their
--      own (024, 032). Removing a like already removes its notification
--      (the triggers from 036), and the count on the site drops at once
--      (the place pages listen to these tables, 029 and 032).
--   2. admin_likers(kind, id): the travelers who liked one review or reply,
--      newest first, with their display name only (never an email). Names
--      live in Supabase Auth (auth.users), which the app cannot read, so
--      this function reads them with the owner's rights ("security
--      definer") and refuses anyone who is not an admin.
--
-- Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. Admins may remove any like --------------------------------------------

drop policy if exists "admins can remove any review like" on public.review_likes;

create policy "admins can remove any review like" on public.review_likes for
delete to authenticated using ((select public.is_admin ()));

drop policy if exists "admins can remove any reply like" on public.reply_likes;

create policy "admins can remove any reply like" on public.reply_likes for
delete to authenticated using ((select public.is_admin ()));

-- 2. Who liked it (admins only) ---------------------------------------------
--
-- kind is 'review' or 'reply'. The name is worked out the same way as on
-- reviews and replies (030): the display name, at most 40 characters, or
-- "Traveler".

create or replace function public.admin_likers(kind text, target uuid)
returns table (user_id uuid, display_name text, created_at timestamptz)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may see who marked something Helpful.'
      using errcode = '42501';
  end if;
  if kind not in ('review', 'reply') then
    raise exception 'kind must be review or reply' using errcode = '22023';
  end if;

  return query
    select l.user_id,
           coalesce(nullif(left(btrim(u.raw_user_meta_data ->> 'display_name'), 40), ''), 'Traveler'),
           l.created_at
      from (
            select rl.user_id, rl.created_at from public.review_likes rl
             where kind = 'review' and rl.review_id = target
            union all
            select pl.user_id, pl.created_at from public.reply_likes pl
             where kind = 'reply' and pl.reply_id = target
           ) l
      left join auth.users u on u.id = l.user_id
     order by l.created_at desc;
end;
$$;

revoke all on function public.admin_likers(text, uuid) from public, anon;
grant execute on function public.admin_likers(text, uuid) to authenticated;

-- 3. Check it worked ------------------------------------------------------------
--
-- Should list the two new DELETE policies next to the travelers' own:
--   select tablename, policyname from pg_policies
--    where tablename in ('review_likes', 'reply_likes') and cmd = 'DELETE';
--
-- Run as yourself in the SQL Editor (not an admin login there), it should
-- refuse with "Only the Lakat Iloilo team may see who marked something
-- Helpful.":
--   select * from public.admin_likers('review', '00000000-0000-0000-0000-000000000000');
