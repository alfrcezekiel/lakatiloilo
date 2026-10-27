---
paths:
  - "src/**"
---

# Next.js frontend rules

## Talking to the backend

- All calls to the NestJS backend live in `src/lib/api.ts` (axios,
  `NEXT_PUBLIC_API_URL`). Components never build backend URLs
  themselves.
- Writes send the traveler's token from `loginToken()` in
  `src/lib/auth.ts` as `Authorization: Bearer …`.
- Show the backend's own refusal with `backendMessage(error)`, and fall
  back to "Something went wrong. Please try again."
- The Supabase browser client is only for the login session itself:
  `setSession` after a backend log-in, log-out, Forgot password and Set
  new password. Never for places or reviews.

## Screens

- Outcomes the traveler must notice (account created, password changed)
  use `StatusModal`. Smaller confirmations use a `role="status"` line
  near the thing that changed.
- Messages are friendly, complete sentences that say what to do next.
- **Check layout at 375, 768, 1024 and 1440 px wide.** Measure with
  JavaScript (`getBoundingClientRect`), not only by looking. The browser
  pane can show an old screenshot.
- A bar that is `fixed` and centred with `left-1/2 -translate-x-1/2` can
  only use half the screen unless it has a width (`w-max` plus a
  `max-w-[calc(100%-2rem)]`). Logos and icons in a flex row get
  `shrink-0`.

## Checking

- `npx tsc --noEmit`, `npx eslint <files>`, and `npm run build` before
  saying a ticket is ready (the build is what Vercel runs).
