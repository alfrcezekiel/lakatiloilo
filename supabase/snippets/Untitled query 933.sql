select a.user_id, u.email, a.created_at
from public.admins a
join auth.users u on u.id = a.user_id;