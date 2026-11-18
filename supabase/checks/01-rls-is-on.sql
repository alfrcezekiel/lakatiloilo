-- Check 01 — Row Level Security is ON for every table.
--
-- READ-ONLY (SELECT only). Run: Supabase -> SQL Editor -> New query ->
-- paste -> Run.
--
-- Why: these apps are on public URLs. A table without Row Level Security
-- can be read and changed by anyone on the internet who has the
-- publishable key, which every visitor's browser has (CLAUDE.md rule 4).
--
-- SAFE = "Success. No rows returned."
-- Any row is a table to fix at once: write the next supabase/sql/NNN file
-- with `alter table public.<name> enable row level security;` and its
-- policies (use /sql-change).

select c.relname as table_without_rls
from pg_class c
join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')   -- ordinary and partitioned tables
  and not c.relrowsecurity
order by 1;
