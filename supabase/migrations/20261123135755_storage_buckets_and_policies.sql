-- Storage buckets (safe to re-run: skips buckets that already exist)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('review-photos', 'review-photos', true, 2097152,  array['image/jpeg','image/png','image/webp']),
  ('place-photos',  'place-photos',  true, 2097152,  array['image/jpeg','image/png','image/webp']),
  ('review-videos', 'review-videos', true, 52428800, array['video/mp4','video/quicktime','video/webm'])
on conflict (id) do nothing;

-- Storage policies: paste the generated rows from the Step 2 query below this line

drop policy if exists "anyone can view review photos" on storage.objects;
create policy "anyone can view review photos" on storage.objects as PERMISSIVE for SELECT to anon, authenticated using ((bucket_id = 'review-photos'::text));                                                                                                                                                                                                                      
drop policy if exists "travelers can upload to their own photo folder" on storage.objects;
create policy "travelers can upload to their own photo folder" on storage.objects as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'review-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));                                                                                                         
drop policy if exists "travelers can replace their own photos" on storage.objects;
create policy "travelers can replace their own photos" on storage.objects as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'review-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) with check (((bucket_id = 'review-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))); 
drop policy if exists "travelers can delete their own photos" on storage.objects;
create policy "travelers can delete their own photos" on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'review-photos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));                                                                                                                                
drop policy if exists "admins can delete review photos" on storage.objects;
create policy "admins can delete review photos" on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'review-photos'::text) AND ( SELECT is_admin() AS is_admin)));                                                                                                                                                                                 
drop policy if exists "admins can replace place photos" on storage.objects;
create policy "admins can replace place photos" on storage.objects as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'place-photos'::text) AND ( SELECT is_admin() AS is_admin))) with check (((bucket_id = 'place-photos'::text) AND ( SELECT is_admin() AS is_admin)));                                                                                           
drop policy if exists "anyone can view place photos" on storage.objects;
create policy "anyone can view place photos" on storage.objects as PERMISSIVE for SELECT to anon, authenticated using ((bucket_id = 'place-photos'::text));                                                                                                                                                                                                                         
drop policy if exists "admins can upload place photos" on storage.objects;
create policy "admins can upload place photos" on storage.objects as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'place-photos'::text) AND ( SELECT is_admin() AS is_admin)));                                                                                                                                                                               
drop policy if exists "admins can delete place photos" on storage.objects;
create policy "admins can delete place photos" on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'place-photos'::text) AND ( SELECT is_admin() AS is_admin)));                                                                                                                                                                                    
drop policy if exists "anyone can view review videos" on storage.objects;
create policy "anyone can view review videos" on storage.objects as PERMISSIVE for SELECT to anon, authenticated using ((bucket_id = 'review-videos'::text));                                                                                                                                                                                                                      
drop policy if exists "travelers can upload to their own video folder" on storage.objects;
create policy "travelers can upload to their own video folder" on storage.objects as PERMISSIVE for INSERT to authenticated with check (((bucket_id = 'review-videos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));                                                                                                         
drop policy if exists "travelers can replace their own videos" on storage.objects;
create policy "travelers can replace their own videos" on storage.objects as PERMISSIVE for UPDATE to authenticated using (((bucket_id = 'review-videos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))) with check (((bucket_id = 'review-videos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text))); 
drop policy if exists "travelers can delete their own videos" on storage.objects;
create policy "travelers can delete their own videos" on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'review-videos'::text) AND ((storage.foldername(name))[1] = (( SELECT auth.uid() AS uid))::text)));                                                                                                                                
drop policy if exists "admins can delete review videos" on storage.objects;
create policy "admins can delete review videos" on storage.objects as PERMISSIVE for DELETE to authenticated using (((bucket_id = 'review-videos'::text) AND ( SELECT is_admin() AS is_admin)));       