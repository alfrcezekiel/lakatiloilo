-- Storage used, for the admin Overview (reviews & media round, ticket 167).
--
-- Supabase's free plan holds 1 GB of files for the whole project. Photos and
-- now review videos (065) fill it, and uploads fail once it is full. The
-- Overview will show how much is used ("312 MB of 1 GB"), amber past 80 %.
--
-- Files live in storage.objects, which no one may read through the app
-- except as each bucket's rules allow. This adds one read-only function,
-- for admins only, that adds up the size of the files: per bucket for the
-- three the app fills (place-photos, review-photos, review-videos), and
-- across every bucket, because the 1 GB limit counts all of them. It reads
-- sizes only, never names or contents.
--
-- Nothing here touches the service_role, and Row Level Security stays on.
--
-- Run once in Supabase -> SQL Editor -> New query -> paste -> Run.

create or replace function public.admin_storage_used()
returns jsonb
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
  return (
    select jsonb_build_object(
      'place_photos',  coalesce(sum(size) filter (where bucket_id = 'place-photos'), 0),
      'review_photos', coalesce(sum(size) filter (where bucket_id = 'review-photos'), 0),
      'review_videos', coalesce(sum(size) filter (where bucket_id = 'review-videos'), 0),
      'total',         coalesce(sum(size), 0)
    )
    from (
      -- Storage keeps each file's size, in bytes, in its metadata.
      select o.bucket_id, coalesce((o.metadata ->> 'size')::bigint, 0) as size
        from storage.objects o
    ) files
  );
end;
$$;

revoke all on function public.admin_storage_used() from public, anon;
grant execute on function public.admin_storage_used() to authenticated;

-- Check it worked ------------------------------------------------------------
--
-- Should show the function, security definer (prosecdef = true):
--   select proname, prosecdef from pg_proc where proname = 'admin_storage_used';
-- Should be false for anon and true for authenticated:
--   select has_function_privilege('anon', 'public.admin_storage_used()', 'execute') as anon_may,
--          has_function_privilege('authenticated', 'public.admin_storage_used()', 'execute') as logged_in_may;
-- The same totals, read here as the project owner (compare with the
-- Overview once it is built, and with Settings -> Usage in Supabase):
--   select bucket_id, pg_size_pretty(sum((metadata ->> 'size')::bigint)) from storage.objects group by bucket_id;
