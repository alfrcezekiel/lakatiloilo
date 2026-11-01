# 62 — Polish round: final check

**What to build:** The team walks through the "Polish round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 58, 59, 60, 61

**Status:** in progress

- [ ] Every item in the "Polish round" checklist works on the live URL
- [ ] Existing browsing, search, reviews, sign-up, log-in, log-out and password reset still work
- [ ] /code-review has been run on the round and its findings handled
- [ ] Works on the live URL

**Progress (2026-11-01):** /code-review ran on the round (from 04bc97c: tickets 57–61). No must-fix findings: no secrets, no `.env` with real values, no database or Row Level Security changes, no raw HTML, and the build passes. Handled:
1. Spec, "reduce motion": older effects still moved with it on. The photo zoom on Featured and category cards and the "View details" arrow now only move when motion is allowed; the menu button's lines still turn into an X, but instantly; the nav links, category cards and scroll-to-top button jump instead of gliding.
2. Spec, loading skeleton: the detail page skeleton rose in, then the real page rose in again. The skeleton now stays still (measured on a production build: 0 animation wrappers in the skeleton, 7 in the real page).
3. Judgement: the "Hotel"/"Condominium" names moved from the accommodation page into the shared labels file, next to every other display name. The page still shows "Hotel".
4. Judgement: TanStack Query and Motion are outside the original stack; no change, because the team agreed to both in the spec on 2026-11-01 (free libraries, no hosted service).
Type-check, lint and `npm run build` pass. Not checked: the team's walk-through of the checklist, and these fixes on the live URL (not pushed yet).
