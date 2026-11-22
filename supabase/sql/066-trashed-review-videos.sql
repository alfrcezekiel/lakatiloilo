-- Videos of reviews in the Trash (reviews & media round, ticket 166).
--
-- When a review is deleted for good — by an admin pressing "Delete for
-- good", or after 30 days in the Trash (062) — its photo files are removed
-- from Storage, because the delete functions in 062 answer their paths.
-- They don't know about review videos (065), so a deleted review's video
-- file would stay in Storage for ever, using up the free plan's space.
--
-- Reviews in the Trash can't be read by anyone, admins included (060: the
-- read rules ask for trashed_at is null); the Trash screen reads them through
-- functions. This adds one more such function: the videos of reviews in the
-- Trash, for admins only, read-only. The backend asks it just before and
-- just after a delete for good, in the same transaction, and removes the
-- files of the reviews that are gone. The 30-day rule stays in one place
-- (062); nothing in 062 is changed.
--
-- Nothing here touches the service_role, and Row Level Security stays on.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

create or replace function public.admin_trashed_review_videos()
returns table (review_id uuid, video_path text)
language plpgsql
stable
security definer
set search_path = ''
as $$
begin
  if not (select public.is_admin ()) then
    raise exception 'This is for the Lakat Iloilo team.'
      using errcode = '42501';
  end if;
  -- A review is in the Trash when it has trashed_at (060), also when it
  -- went with its place (061).
  return query
    select r.id, r.video_path
      from public.reviews r
     where r.trashed_at is not null
       and r.video_path is not null;
end;
$$;

revoke all on function public.admin_trashed_review_videos() from public, anon;
grant execute on function public.admin_trashed_review_videos() to authenticated;

-- Check it worked ------------------------------------------------------------
--
-- Should show the function, security definer (prosecdef = true):
--   select proname, prosecdef from pg_proc where proname = 'admin_trashed_review_videos';
-- Should be false for anon and true for authenticated:
--   select has_function_privilege('anon', 'public.admin_trashed_review_videos()', 'execute') as anon_may,
--          has_function_privilege('authenticated', 'public.admin_trashed_review_videos()', 'execute') as logged_in_may;
-- As anyone but an admin, calling it answers "This is for the Lakat Iloilo team."
