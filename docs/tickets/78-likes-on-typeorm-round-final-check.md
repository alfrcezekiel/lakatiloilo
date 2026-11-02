# 78 — Likes on TypeORM round: final check

**What to build:** The team walks through the "Likes on TypeORM round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 76, 77

**Status:** done (confirmed by the team on the live URL, 2026-11-02)

- [x] Every item in the "Likes on TypeORM round" checklist works on the live URL
- [x] Existing reviews, Helpful likes, profiles, the profile dropdown and log-in still work
- [x] /code-review has been run on the round and its findings handled
- [x] Works on the live URL

**Progress (2026-11-02):** /code-review ran on the round (from d99e15d, the last push: tickets 76 and 77, uncommitted), both axes one after the other.

Spec: everything in the round's Data, endpoint and architecture lines is built; nothing missing and nothing extra. The hand-written SQL still in the backend is exactly what the spec keeps out of scope (the act-as-the-traveler step; adding, editing and deleting reviews), plus the one-line "select auth.uid()", which asks who the traveler is rather than reading a table.

Safety and Standards: no must-fix findings. No database or Row Level Security change; TypeORM never sends user_id or created_at (proved in ticket 76); every value travels as a parameter; no secrets or console.log added; backend type-check and lint pass. Judgement calls left for the team:
1. reviews.service.ts has grown to 350 lines doing several jobs (reading reviews, ratings, writing reviews, likes, acting as the traveler, turning database errors into messages).
2. The Helpful-count sub-query is written twice (reviews and profiles).

Not done yet: the team's walk-through of the "Likes on TypeORM round" checklist on the live URL (tickets 76 and 77 are not pushed yet).

**Review findings handled (2026-11-02, team request: fix 2, park 1):**
2. The Helpful-count sub-query now lives once, as helpfulCountOf next to the ReviewLike entity; reviews and profiles both use it. Checked: Seda Atria's reviews answered exactly as before; Agony Hill's reviews and Red's profile now show one more Helpful each, because the team marked reviews while testing, and every count (4 of 4 reviews, 15 of 15 profile reviews) matches a direct count of the review_likes table; the rolled-back check with a like in place gave the same answers as in ticket 77. Backend type-check and lint pass.
1. Splitting reviews.service.ts (350 lines) into a likes service is parked in docs/LATER.md, together with moving the rest of the reviews SQL onto TypeORM.

**Checked by the team on the live URL (2026-11-02):** every item in the "Likes on TypeORM round" checklist passed on a laptop and a phone, and writing reviews, profiles and the profile dropdown still work. Review finding 2 was fixed before the push; finding 1 is parked in docs/LATER.md.
