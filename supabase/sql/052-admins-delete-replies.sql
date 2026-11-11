-- Admins may delete any reply (full admin management round, ticket 124).
--
-- On the dashboard's Reviews screen, "Show replies" opens a review's
-- replies, each with "Delete reply". It must work exactly like a writer
-- deleting their own reply (delete_own_reply, 034, 035 and 037):
--   - a reply that has answers stays in its place as "This reply was
--     deleted": its text, name, tag and writer are emptied, its Helpful
--     likes and notifications are removed, and its answers stay;
--   - a reply with no answers is removed, and a deleted reply above it
--     that is left with no answers goes too (climbing the thread).
--
-- Travelers cannot delete replies directly (034 took that away); they
-- only have delete_own_reply. This adds admin_delete_reply, the same rule
-- for any reply, which refuses anyone who is not an admin (038's
-- is_admin()). It is "security definer" (it runs with the table owner's
-- rights, like delete_own_reply), so the is_admin() check inside is what
-- protects it. Nothing here uses the service_role key.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

-- 1. The function ----------------------------------------------------------
--
-- Answers 'kept' (stays as "This reply was deleted"), 'removed', or null
-- when the reply does not exist or was already deleted.

create or replace function public.admin_delete_reply(target uuid)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  reply public.review_replies%rowtype;
  parent public.review_replies%rowtype;
  next_parent uuid;
begin
  if not public.is_admin() then
    raise exception 'Only the Lakat Iloilo team may delete other travelers'' replies.'
      using errcode = '42501';
  end if;

  select * into reply
    from public.review_replies
   where id = target
     and deleted_at is null
     for update;
  if not found then
    return null;
  end if;

  if exists (select 1 from public.review_replies where parent_reply_id = target) then
    update public.review_replies
       set comment = '',
           replier_name = '',
           traveler_type = null,
           user_id = null,
           deleted_at = now()
     where id = target;
    delete from public.reply_likes where reply_id = target;
    delete from public.notifications where reply_id = target;
    return 'kept';
  end if;

  delete from public.review_replies where id = target;

  -- Climb the thread: a deleted reply left with no answers goes too.
  next_parent := reply.parent_reply_id;
  while next_parent is not null loop
    select * into parent from public.review_replies where id = next_parent for update;
    exit when not found
           or parent.deleted_at is null
           or exists (select 1 from public.review_replies where parent_reply_id = parent.id);
    delete from public.review_replies where id = parent.id;
    next_parent := parent.parent_reply_id;
  end loop;

  return 'removed';
end;
$$;

revoke all on function public.admin_delete_reply(uuid) from public, anon;
grant execute on function public.admin_delete_reply(uuid) to authenticated;

-- 2. Check it worked ------------------------------------------------------------
--
-- Should list the function, with security definer = true:
--   select proname, prosecdef from pg_proc where proname = 'admin_delete_reply';
--
-- Run as yourself in the SQL Editor (not an admin login there), it should
-- refuse with "Only the Lakat Iloilo team may delete other travelers'
-- replies." and change nothing:
--   select public.admin_delete_reply('00000000-0000-0000-0000-000000000000');
