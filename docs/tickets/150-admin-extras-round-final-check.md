# 150 — Admin extras round: final check

**What to build:** The team walks through the "Admin extras round (live URL)" checklist in the spec, on a laptop and a phone, and ticks it off.

**Blocked by:** 139, 140, 141, 142, 143, 144, 145, 146, 147, 148, 149

**Status:** done

- [x] Every item in the "Admin extras round" checklist works on the live URL
- [x] Every new admin endpoint refuses a logged-out visitor (401) and a traveler (403) (checked with curl)
- [x] Place pages, reviews, replies, photos, credits and the splash art still work for travelers
- [x] /code-review has been run on the round and its findings handled
- [x] Works on the live URL

## Progress (2026-11-15)

- curl on localhost, all 14 new admin endpoints of the round (PATCH categories/:id; replies/:id/hide and /show; GET trash; the three trash restores; the three Delete for good; place photos add, credits, move, delete): **401** without a login and **401** with a fake one. Not yet checked: 403 with a real traveler's login (needs the team's own login) and the live URL.
- /code-review run on round 30 (uncommitted changes since 816c745 plus SQL 056–062): no must-fix items; findings reported to the team.
- Code review findings fixed (2026-11-15, team request "fix immediately"):
  - Spec 1: Overview "Reports waiting" / "Reported reviews" leave out reports on reviews in the Trash (admin-overview.service.ts).
  - Spec 2: "Replies (N)" and the Most relevant sort leave out replies in the Trash (admin-reviews.service.ts).
  - Spec 3: dated change notes on the three older SPEC.md lines that said a delete was final.
  - 🟡 1: the "restore the place first" sentence is matched whole, not by one word (admin-trash.service.ts).
  - 🟡 2: supabase/sql/063 drops admin_delete_reply, unused since 148. Run by the team ("Success. No rows returned"); checked: admin_delete_reply is gone, and admin_trash_reply, delete_trashed_reply and delete_own_reply are still there.
  - 🟡 3: the 7 Trash routes moved to admin-trash.controller.ts (same addresses), added to AdminModule's forRoutes; admin.controller.ts 551 → 457 lines. curl: still 401 without or with a fake login; an unknown address still 404.
  - 🟡 5: Hide it / Show it on a reply in the Trash answers 409 "That reply is in the Trash. Restore it first." instead of 503.
  - 🟡 4: the four unused splash images in public/ (round 29) are untracked; left out of the commit, deleting them waits for the team's yes.

## Done (2026-11-15)

- The team walked through the "Admin extras round (live URL)" checklist on the live URL after commit fdf0465 and confirmed it all works. Tickets 139–150 marked done at the team's word.
- The traveler check was the team's: logged in as a traveler on the live site, /admin/trash showed "not found". The 401 cases were checked with curl; the 403 was confirmed through the website with a real traveler login, not with curl.
