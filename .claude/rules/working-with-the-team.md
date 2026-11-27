# Working with the Lakat Iloilo team

Lessons from building this project. They add to CLAUDE.md; where they
differ, these win, because the team asked for them.

## Commits

- **Commit and push only when the team asks.** This overrides step 5 of
  `/implement` and rule 1 of CLAUDE.md. Finish the ticket, report, and
  wait for "commit and push".
- **Commit only the files the team named.** If `git status` shows a file
  you did not change (for example `.claude/launch.json`, or a file the
  team edited by hand), leave it out and say so in one line. Ask before
  including it.
- Before every commit, check that no `.env`, `.env.local` or
  `backend/.env` is staged, and that no `service_role` or `sb_secret_`
  value appears in the staged diff.
- Commit messages: `feat: NN — what it does`, `fix: …`, `docs: …`,
  `refactor: …`, `chore: …`, ending with the attribution line the app asks for.
- **A commit message says what the commit changes.** A package update gets
  its own commit, such as `chore: update Supabase CLI to 3.4.0`, never one
  hidden under another message. The Supabase CLI matters most: the Deploy
  workflow uses it on the hosted databases. (Code review, 2026-11-27: an
  update to it was committed as "redeploy staging".)
- **Never push an empty commit to redeploy.** Re-run the Deploy workflow
  (GitHub → Actions → Deploy → Re-run all jobs), or press **Redeploy** on
  that branch's newest deployment in Vercel
  (`docs/ENVIRONMENT-CHECKLIST.md`, step 9).

## Testing

- **The team tests real logins.** Never create an account, or type a real
  password, on the hosted Supabase project. To check a sign-up or log-in
  screen, fake the backend's answer in the browser (replace the request
  with a pretend response) and say clearly that it was a pretend answer.
- **"It's still broken" after a change: ask for a hard refresh first**
  (Ctrl+Shift+R). Old browser tabs kept old code and caused three false
  bug reports in this project.
- Check what you can yourself: call the backend with `curl` for the
  refusal cases (no login, fake login, bad id) and report the status
  codes and messages you got.

## Tickets and docs

- **Tick a ticket's box only after the team confirms it**, on localhost
  or on the live URL as the box says. Mark a ticket `done` only when the
  team says so.
- When the team changes their mind mid-ticket, add a dated
  `**Change (YYYY-MM-DD, team request):**` note to the ticket and update
  the matching line in `docs/SPEC.md` in the same turn, so the docs never
  describe the old behaviour.
- Progress notes say what was checked, how, and what is still not
  checked.

## Explaining

- Lead with the outcome in one sentence, then what changed (with file
  links), then how it was checked, then what the team should test.
- Name the root cause in plain words when fixing a bug ("the navbar could
  only use half the screen, so the logo was squeezed"), not only the fix.
