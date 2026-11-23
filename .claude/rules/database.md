---
paths:
  - "supabase/**"
---

# Supabase database rules

- Every schema and RLS change is a new migration, made with
  `npx supabase migration new <name>`. Never edit a migration that has
  already been shared; write a new one that changes it.
- `supabase/sql/` is history. Do not add to it or run its files.
- Never make schema or RLS changes directly in the Supabase dashboard.
- Start each migration with a plain-English comment: what it changes
  and why.
- Every new table: `enable row level security` and explicit policies in
  the same file. Grant only the columns travelers may write.
- The backend's `lakat_api` role needs its own `grant select` and a
  policy to read a table (see `supabase/sql/016` and `023` for the shape).
- End with commented check queries the team can run to see it worked
  (for example `select … from pg_policies where tablename = '…'`).
- Test every migration with `npx supabase db reset`. It wipes the local
  database only, then replays all migrations and `supabase/seed.sql`.
  Never add `--remote` or `--linked`.
- Never apply a migration to a hosted project yourself. Show the file,
  ask the team to apply it, and wait for "it worked" before building on
  it.
- To prove a rule works (for example "a stranger cannot edit this
  review"), run the check through the backend's own login inside
  `begin; … rollback;`, so nothing is kept, and report what each step
  changed.
