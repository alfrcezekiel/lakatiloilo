---
name: sql-change
description: Writes the next numbered SQL file in supabase/sql/ for a database change — with Row Level Security, policies, grants for the website and the backend's lakat_api role, and check queries — and walks the team through running it in the Supabase SQL Editor. Use whenever a ticket needs a new table, column, policy or grant.
disable-model-invocation: true
---

One database change per file, so the database can be rebuilt from the
repo.

## Steps

1. **Find the number:** `ls supabase/sql` and use the next one, for
   example `024-<what-it-does>.sql`. Never edit a file the team already
   ran.
2. **Write the file**, in this order:
   - A plain-English comment: what changes, why, which ticket, and
     "Run once in Supabase -> SQL Editor -> New query -> paste -> Run."
   - The change itself.
   - For a new table: `alter table … enable row level security;` and
     explicit policies for each action (select, insert, update, delete).
     Anyone may read only if the spec says so. Writes check
     `auth.uid() = user_id`.
   - Grants: only the columns travelers may write
     (`grant insert (col, col) on … to authenticated`).
   - If the backend reads it: `grant select … to lakat_api` and an
     "api can read …" policy (see 023).
   - Commented check queries at the end
     (`select policyname, roles from pg_policies where tablename = '…';`).
3. **Show the team the file** and explain each part in one line each.
   Tell them exactly where to paste it.
4. **Stop and wait** for "it worked" (or the error message). Do not
   build code that needs the change before then.
5. If they paste an error: explain it in plain words and write a fixed
   file. If it fails the same way twice, stop and explain what you think
   is wrong.

## Never

- Turn Row Level Security off, even for a moment.
- Grant anything to `anon` beyond what the spec says the public may do.
- Use or mention the `service_role` key as a fix.
