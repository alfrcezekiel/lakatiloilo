# 70 — Buttons & cards round: final check

**What to build:** The team walks through the "Buttons & cards round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 66, 67, 68, 69

**Status:** done (confirmed by the team on the live URL, 2026-11-01)

- [x] Every item in the "Buttons & cards round" checklist works on the live URL
- [x] Existing browsing, search, reviews, sign-up, log-in, log-out, password reset, animations and page fades still work
- [x] /code-review has been run on the round and its findings handled
- [x] Works on the live URL

**Progress (2026-11-01):** /code-review ran on the round (from 73cecd8: ticket 66 in 560cd6c, plus the uncommitted work for 67, 68 and 69), both axes one after the other. Spec: every line of screen 19, the Data note and the GET /v1/ratings endpoint line is built; nothing missing. One addition beyond the screen text: writing, editing or deleting a review calls router.refresh, which the checklist line "Writing a review, then going back home, updates that card's rating" needs for the browser's Back button. Checked that this refresh keeps the detail page in place (the page stays fully visible, the Rating tile and the page are not rebuilt). Safety and Standards: no must-fix findings (no secrets, no `.env`, no raw HTML, no SQL built from text, no database or Row Level Security changes, build passes). Two judgement calls left for the team: (1) the destination and accommodation card lists are near copies of each other and this round added the same lines to both; (2) each review change now also asks the backend for the place once more (cheap, one request). Not done yet: the team's walk-through of the "Buttons & cards round" checklist on the live URL (tickets 67–69 are not pushed yet).

**Checked by the team on the live URL (2026-11-01):** every item in the "Buttons & cards round" checklist passed on a laptop and a phone, and the existing features still work. The two judgement calls from the code review (one shared place-card component; the extra request after a review change) were left as they are.
