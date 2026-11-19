---
name: ship
description: Safely commits and pushes the work the team names — checks for secrets, leaves out files nobody asked for, runs the build, writes a clear message, pushes to main so Vercel redeploys, and tells the team what to test on the live URL. Use when the team says "commit and push".
disable-model-invocation: true
---

Only run when the team has asked to commit. Pushing to `main` deploys
the website and the backend to the live URL.

## Steps

1. **Look:** `git status --short` and `git diff --stat`.
2. **Match the request to the files.** Stage only what the team named
   (for example "the logo fix" → `src/components/DockNavbar.tsx`). For
   every other changed or new file, list it in one line and leave it
   out unless the team says otherwise. If a file's changes are not
   yours, show its diff and ask.
3. **Secrets check** on what is staged:
   - No `.env`, `.env.local` or `backend/.env`
     (`git diff --cached --name-only`).
   - No `service_role`, `sb_secret_` or real-looking passwords in
     `git diff --cached`.
   - Stop and explain if anything turns up.
4. **Build check** if code changed: `npx tsc --noEmit`, `npm run lint`,
   and `npm run build`. For backend changes, use
   `cd backend && npx tsc --noEmit -p tsconfig.json` (never the backend
   build while the team's watcher runs). Fix failures before committing.
5. **Commit** with `feat|fix|docs|refactor|chore: [NN —] what it does`,
   a few bullet lines if it covers several things, and the attribution
   line.
6. **Push:** `git push origin main`. Show the commit id and confirm
   `git status` shows only the files you left out.
7. **Tell the team** what went live, what stayed out, and what to check
   on the live URL in a minute or two (after a hard refresh).
