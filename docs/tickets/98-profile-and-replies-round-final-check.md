# 98 — Profile & replies round: final check

**What to build:** The team walks through the "Profile & replies round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 94, 95, 96, 97, 99

**Status:** todo

- [ ] Every item in the "Profile & replies round" checklist works on the live URL
- [ ] Reviews, replies, photos, reports, Helpful likes on reviews, profiles and log-in still work
- [x] /code-review has been run on the round and its findings handled
- [ ] Works on the live URL

**Progress (2026-11-06):** /code-review run on all uncommitted work since 8ec9df2 (tickets 94–97 and 99, plus the team's no-white-hover and no-blur design change in 11 website files and .claude/rules/no-white-hover-backdrop.md). Re-checked: backend and website type-check, website lint and `npm run build` pass; reply_likes has Row Level Security on with four policies; no secret keys, .env files, raw HTML or console.log in the changes.

Findings (none must-fix): the design change is not yet in docs/SPEC.md; the place page's side panel lost its blur although it overlaps the photo on laptops; and four earlier small items (the Supabase settings check copied three times, the Helpful button's `review` input name, ReviewReplies.tsx at 480 lines, a 1-character name possible by skipping the website). Waiting for the team's choice on which to fix.

Not checked: the live URL (after "commit and push").

**Review fixes (2026-11-06, team request "fix the spec note and safety and standards"):**
- docs/SPEC.md: a dated Change note for the no-white-box / less-blur design change (screen 25), and a Data line for short names.
- The place page's side panel keeps its blur again, because it rises into the photo on a laptop; the rule file now lists it with the other things over a photo.
- Backend: the Supabase settings check is one helper instead of three copies.
- The Helpful button's input is called `item` (it takes reviews and replies).
- The reply form moved to its own file (ReviewReplies.tsx is 408 lines, ReplyForm.tsx 83).
- supabase/sql/033-short-display-names.sql: names under 2 characters show as "Traveler". Not yet run; the name rule was tested read-only (A → Traveler, spaces → Traveler, "  Al  " → Al, 50 letters → cut to 40), and no saved name is under 2 characters today.

Checked: backend type-check and lint, website type-check, lint and `npm run build` pass; the backend still answers (GET /v1/auth/me 401 without a login, a profile 200). Not checked: 033 run by the team, the side panel, replies and Helpful in a browser, and the live URL.

**Team check (2026-11-06):** the team ran 033 in the SQL Editor and it succeeded. Read-only check through the backend's login afterwards: the helper answers Traveler, Traveler, Al; no review or reply name is under 2 characters; all three triggers use the helper; Row Level Security is still on for reviews, review_replies and reply_likes. The team checked the side panel on destinations and accommodations on a laptop: it reads clearly over the photo. Then, after a hard refresh, the team posted, edited and cancelled a reply, and Helpful works. Not checked yet: the live URL.
