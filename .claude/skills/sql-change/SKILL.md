---
name: sql-change
description: Creates a Supabase CLI migration in supabase/migrations/ for a database change — with Row Level Security, policies, grants for the website and the backend's lakat_api role, and check queries — and tests it with a local database reset. Use whenever a ticket needs a new table, column, policy or grant.
disable-model-invocation: true
---

One database change per migration, so the database can be rebuilt from
the repo.

## Steps

1. **Create the file:** run `npx supabase migration new <what-it-does>`.
   Never edit a migration that has already been shared, and never add
   to `supabase/sql/`, which is now history.
2. **Write the file**, in this order:
   - A plain-English comment: what changes, why, and which ticket.
   - The change itself.
   - For a new table: `alter table … enable row level security;` and
     explicit policies for each action (select, insert, update, delete).
     Anyone may read only if the spec says so. Writes check
     `auth.uid() = user_id`.
   - Grants: only the columns travelers may write
     (`grant insert (col, col) on … to authenticated`).
   - If the backend reads it: `grant select … to lakat_api` and an
     "api can read …" policy (see `supabase/sql/023`).
   - Commented check queries at the end
     (`select policyname, roles from pg_policies where tablename = '…';`).
3. **Test it locally:** run `npx supabase db reset`. It wipes the local
   database, then replays every migration and `supabase/seed.sql`. Docker
   must be running. Never add `--remote` or `--linked`.
4. **Show the team the file** and explain each part in one line each.
   Report what the reset and the check queries showed.
5. **Stop and wait.** The team applies the migration to hosted projects.
   Do not build code that depends on the hosted change until they say
   "it worked" or send the error message.
6. If it fails: explain the error in plain words. Fix the file only if
   it has not been shared; otherwise write a new migration. If it fails
   the same way twice, stop and explain what you think is wrong.

## Never

- Turn Row Level Security off, even for a moment.
- Grant anything to `anon` beyond what the spec says the public may do.
- Use or mention the `service_role` key as a fix.
- Change the schema or RLS in the Supabase dashboard.
- Apply a migration to a hosted project yourself.
