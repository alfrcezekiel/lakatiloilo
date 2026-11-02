# 93 — Live updates round: final check

**What to build:** The team walks through the "Live updates round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 89, 90, 91, 92

**Status:** done

- [x] Every item in the "Live updates round" checklist works on the live URL
- [x] Reviews, replies, photos, reports, Helpful likes, profiles, search and log-in still work
- [x] /code-review has been run on the round and its findings handled
- [x] Works on the live URL

**Progress (2026-11-02):** tickets 89–92 confirmed by the team on the live URL, including a phone after it slept. /code-review run on the round (ef761dc..99ff1f5): no must-fix findings; one judgement call (every review change on the site refetches the reviews on every open place page), parked in docs/LATER.md by the team. Not yet checked: the spec's "Live updates round (live URL)" checklist item by item, the database check queries for Row Level Security and the Realtime list, and the rest of the app (replies, photos, reports, profiles, search, log-in) after the push.

**Checked by the team (2026-11-02):** the rest of the app (reviews, replies, photos, reports, Helpful likes, profiles, search, log-in) still works, on localhost and a phone. The spec checklist was walked through on localhost and a phone. 029 was run again ("Success. No rows returned"; safe, it skips tables already on the list), its check queries are comments, so they were run separately afterwards (see below).

**Database check by the team (2026-11-02):** the three check queries from 029 ran. The Realtime list holds exactly the five tables (no review_reports), "puballtables" is false, and Row Level Security is on for all five. The checklist walk-through was on the live URL.
