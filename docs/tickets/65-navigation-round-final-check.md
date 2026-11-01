# 65 — Navigation round: final check

**What to build:** The team walks through the "Navigation round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 63, 64

**Status:** done (walked on the live URL by the team on a laptop and a phone, 2026-11-01)

- [x] Every item in the "Navigation round" checklist works on the live URL
- [x] Existing browsing, search, reviews, sign-up, log-in, log-out, password reset and the polish round animations still work
- [x] /code-review has been run on the round and its findings handled
- [x] Works on the live URL

**Progress (2026-11-01):** /code-review ran on the round (from 97d9db8: ticket 63 with the login form fix, the review long-word fix, ticket 64). No must-fix findings: no secrets, no `.env` with real values, no database or Row Level Security changes, no raw HTML, and the build passes. Handled:
1. Spec, page fade: each new page faded in over the site's plain base colour (white, or near-black in dark mode), so the dark teal pages flashed light for a moment. The colour behind every page is now the site's dark teal; the base colour setting itself is unchanged, because text boxes use it.
2. Judgement: the login file had grown to 400 lines doing four jobs. The old Supabase login clean-up moved into its own file (login file now 334 lines) and runs once per page load from the site-wide wrapper, on every page except the password-reset pages, as the spec says.
Checked on a production build: the page and the colour behind it measure dark teal (rgb 4, 47, 46), including at the start of a fade when the page is fully see-through; a pretend leftover Supabase cookie (not a real login, so nothing was sent to Supabase) was deleted on the photo credits page and kept on the Set new password page. Type-check, lint and `npm run build` pass. Not checked: the team's walk-through of the checklist, and these fixes on the live URL (not pushed yet).

**Checked by the team on the live URL (2026-11-01):** every item in the "Navigation round" checklist passed on a laptop and a phone, and the existing features still work.
