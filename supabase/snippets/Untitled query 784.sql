-- Make an existing account an admin (staging)
insert into public.admins (user_id)
select id
from auth.users
where email = 'admin@example.com'   -- ← change this to the account's email; never commit a real one
on conflict (user_id) do nothing
returning user_id;