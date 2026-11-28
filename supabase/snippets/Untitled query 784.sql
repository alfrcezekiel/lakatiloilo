-- Make an existing account an admin (staging)
insert into public.admins (user_id)
select id
from auth.users
where email = 'aelfric.dev@gmail.com'   -- ← change this
on conflict (user_id) do nothing
returning user_id;