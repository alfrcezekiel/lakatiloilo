# 153 — Backend address is server-side only

**What to build:** Remove `NEXT_PUBLIC_API_URL` everywhere. The backend
address lives only in the server-side `API_URL` variable (in `.env.local`
and in Vercel). The built browser JavaScript and the network tab never show it.

**Why (plain English):** In Next.js, any variable whose name starts with
`NEXT_PUBLIC_` is copied into the JavaScript that every visitor downloads.
A variable without that prefix stays on the server. So just renaming the
variable is what actually hides the address. This ticket proves it by
searching the built files.

**Blocked by:** 152

**Status:** done

- [x] `NEXT_PUBLIC_API_URL` is removed from `.env.local` and from Vercel environment variables
- [x] `API_URL` is added to `.env.local` with the backend address
- [x] `API_URL` is added to Vercel environment variables
- [x] The Next.js API proxy route uses `API_URL` (server-side) instead of `NEXT_PUBLIC_API_URL`
- [x] The backend address is not visible in browser JavaScript
- [x] The backend address is not visible in the browser network tab
- [x] All existing features continue to work
- [x] `.env.example`, `AGENTS.md` and `.claude/rules/frontend.md` describe `API_URL`, not `NEXT_PUBLIC_API_URL`
- [x] After `npm run build`, a search of `.next/static` finds neither the backend host nor `NEXT_PUBLIC_API_URL`
- [ ] Works on the live URL

## Agent steps

1. **Docs and examples:** in `.env.example` (line ~21) replace
   `NEXT_PUBLIC_API_URL=` with `API_URL=` and a one-line comment
   ("server only — never add NEXT_PUBLIC_"). Update `AGENTS.md` (~196) and
   `.claude/rules/frontend.md` (~11) to match.
2. **Code search must be empty:**
   ```bash
   git grep -n "NEXT_PUBLIC_API_URL"
   ```
   Only ticket and SPEC history may still mention it.
3. **Build and search the output** (works in PowerShell and Git Bash):
   ```bash
   npm run build
   ```
   ```bash
   git grep --no-index -n -e "NEXT_PUBLIC_API_URL" -e "<backend host>" -- .next/static
   ```
   Replace `<backend host>` with the host name only. Expect no results.
4. **Do not touch secrets.** The agent never opens or prints `.env.local`,
   and never changes Vercel variables. The team does that in the Vercel
   dashboard (Settings → Environment Variables): delete `NEXT_PUBLIC_API_URL`,
   add `API_URL` for Production and Preview, then redeploy.
5. **Optional, ask the team first:** tighten backend CORS in
   `backend/src/app-setup.ts` (around line 21). The browser no longer calls
   the backend, so CORS can allow only the website's own origins.

## How to check (agent)

- The two searches above return nothing; report that.
- `npm run start`, load the site, and confirm in the network requests that
  every call is `/api/v1/...`.

## Team tests (live URL)

After the Vercel variable change and redeploy: hard refresh, open DevTools →
Sources, search all files (Ctrl+Shift+F) for the backend host. No results.
Then use the site normally.

**Change (2026-11-19, team request):** Ticket sharpened with step-by-step
agent instructions. Added the example/docs updates and a build-output
search that proves the address is gone. Vercel variables stay a team step.
The existing ticks are kept; the new boxes are not ticked yet.

**Progress (2026-11-19, agent):** `.env.example`, `AGENTS.md` and
`.claude/rules/frontend.md` now describe `API_URL`. After `npm run build`, a
search of `.next/static` for `NEXT_PUBLIC_API_URL`, `localhost:5000` and
`api-lakat-iloilo` found 0 files. Still a team step: in Vercel, delete
`NEXT_PUBLIC_API_URL`, check `API_URL` is set for Production and Preview,
then redeploy. Without `API_URL` on Vercel the proxy answers 500 "Server is
not configured".

**Team confirmed (2026-11-20):** every box ticked on localhost. "Works on the live URL" stays open until the team checks the live site.
