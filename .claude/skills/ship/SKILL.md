---
name: ship
description: Safely commits the work the team names on a branch — checks for secrets, leaves out files nobody asked for, runs the same checks as CI, writes a clear message, pushes the branch and hands the team a pull request link into staging (or, for a release, staging into main). Never pushes to staging or main. Use when the team says "commit and push", "ship it" or "release".
disable-model-invocation: true
---

Only run when the team has asked to commit. GitHub refuses direct pushes
to `staging` and `main` (rulesets: pull request only, with the `backend`,
`frontend` and `migrations` checks green). Work reaches them only through
a pull request, and merging one runs the Deploy workflow (CLAUDE.md,
CI/CD): migrations first, then the backend. So this skill ends with a
pull request link, never a push to `staging` or `main`.

## Steps

1. **Look:** `git branch --show-current`, `git status --short` and
   `git diff --stat`. Run `git fetch origin`.
2. **Be on a work branch.** If the current branch is `staging` or `main`,
   create one from it before committing, keeping the changes:
   `git switch -c <type>/<NN-short-name>` (for example `feat/12-photo-upload`,
   `fix/review-thumbnails`, `chore/ci-typecheck`). Say the new branch's
   name in one line. If already on a work branch, stay on it.
3. **Match the request to the files.** Stage only what the team named
   (for example "the logo fix" → `src/components/DockNavbar.tsx`). For
   every other changed or new file, list it in one line and leave it
   out unless the team says otherwise. If a file's changes are not
   yours, show its diff and ask.
4. **Secrets check** on what is staged:
   - No `.env`, `.env.local`, `.env.staging.local` or `backend/.env*`
     (`git diff --cached --name-only`; only `*.example` files are fine).
   - No `service_role`, `sb_secret_`, database addresses with a real
     password, deploy hook addresses or other real-looking secrets in
     `git diff --cached`.
   - Stop and explain if anything turns up.
5. **Run the same checks as CI** if code changed, and fix failures before
   committing:
   - Website: `npm run lint`, `npm run typecheck`, `npm run test`,
     `npm run build`.
   - Backend: `cd backend && npm run typecheck`, `npx jest`,
     `npx jest --config ./test/jest-e2e.json`. Never the backend build
     while the team's watcher (`nest start --watch`) runs; CI builds it.
   - A new migration: the `migrations` check in CI proves it on a fresh
     database. Locally it was already tested with `npm run db:reset`
     (`/sql-change`).
6. **Commit** with `feat|fix|docs|refactor|chore: [NN —] what it does`,
   a few bullet lines if it covers several things, and the attribution
   line.
7. **Push the branch:** `git push -u origin <branch>`. Never
   `git push origin staging` or `git push origin main`. Show the commit id
   and confirm `git status` shows only the files you left out.
8. **Hand over the pull request.** Check for an open one first (the repo
   is public, so no login is needed):
   `curl -s "https://api.github.com/repos/alfrcezekiel/lakatiloilo/pulls?head=alfrcezekiel:<branch>&state=open"`.
   - If one exists, the push already updated it: give its link.
   - Otherwise give a link that opens a new pull request into `staging`
     with the title and a short description filled in (URL-encode both):
     `https://github.com/alfrcezekiel/lakatiloilo/compare/staging...<branch>?expand=1&title=…&body=…`.
     If `gh` is installed and signed in, `gh pr create --base staging`
     works too. The team clicks **Create pull request** themselves.
9. **Tell the team**, in this order:
   - what is on the branch, and what stayed out;
   - that the three checks run on the pull request, and Merge stays
     blocked until they are green (if one fails, send the check's name
     and error lines);
   - that merging deploys **staging** (database first, then backend; the
     website deploys by itself), and what to check on the staging site
     after a hard refresh (Ctrl+Shift+R).

## Releasing to the live site ("release", "put it live")

When staging has been tested and the team asks to go live, nothing is
committed. Instead:

1. `git fetch origin` and list what goes live:
   `git log --oneline --no-merges origin/main..origin/staging`.
2. Give a prefilled pull request link **staging → main**
   (`…/compare/main...staging?expand=1&title=…&body=…`), with those
   commits and what to check after merging.
3. Before they merge, remind them: merging runs Deploy on **production**
   (live database, then live backend). If the release has a new
   migration, a teammate first runs a read-only dry run with
   production's Session pooler address, in their own terminal, never
   pasted into chat:
   `npx supabase db push --remote="PRODUCTION-SESSION-POOLER-URL" --dry-run`.
4. After the merge, check without logging in: the Deploy run's steps
   (`https://api.github.com/repos/alfrcezekiel/lakatiloilo/actions/runs?branch=main`),
   the backend's new production deployment, and the live site. Then ask
   the team to test the live URL.
5. **Sync main back into staging** with a pull request **main → staging**
   (`…/compare/staging...main?expand=1`), so the next release is not
   blocked as "out of date".
