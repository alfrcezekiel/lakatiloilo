---
paths:
  - "supabase/**"
---

# Supabase database rules

- Every database change is a new numbered file in `supabase/sql/` (the
  next number after the highest one). Never edit a file the team has
  already run; write a new one that changes it.
- Start each file with a plain-English comment: what it changes, why,
  and "Run once in Supabase -> SQL Editor -> New query -> paste -> Run."
- Every new table: `enable row level security` and explicit policies in
  the same file. Grant only the columns travelers may write.
- The backend's `lakat_api` role needs its own `grant select` and a
  policy to read a table (see 016 and 023).
- End with commented check queries the team can run to see it worked
  (for example `select … from pg_policies where tablename = '…'`).
- Never run a change file on the hosted project yourself. Show the file,
  ask the team to run it, and wait for "it worked" before building on it.
- To prove a rule works (for example "a stranger cannot edit this
  review"), run the check through the backend's own login inside
  `begin; … rollback;`, so nothing is kept, and report what each step
  changed.
