# 110 — Auto-hide at 3 reports

**What to build:** When 3 different travelers have reported a review, the database hides it by itself, the same way as Hide it, until the team keeps or deletes it. It shows as hidden on the Reports screen.

**Blocked by:** 109

**Status:** todo

- [x] A numbered SQL file adds the trigger that hides a review at its third report from different travelers; the team has run it
- [x] After 3 different accounts report a review, it disappears for everyone else and from the rating, and its writer sees "Hidden while the team reviews it."
- [x] Two reports leave it showing; Keep it on the Reports screen shows it again
- [ ] Works on the live URL

## Progress (2026-11-08)

- **SQL 042** (supabase/sql/042-auto-hide-at-three-reports.sql; the team ran it):
  - a trigger on review_reports hides a review at its 3rd report. Each account can report a review once (026), so these are 3 different travelers.
  - the review guard from 040 also allows hiding (never showing) a review that has 3 or more reports, counted by the database itself
  - no website or backend change: the Hidden badge, the writer's note and the live signal (041) come from ticket 109

**Team check (2026-11-08, localhost):** the team reported one review from 3 traveler accounts, and the third report hid it.

Checked through the backend's own login in a rolled-back transaction:
- reports 1 and 2 leave the review showing; report 3 hides it and adds one live signal
- the writer cannot unhide it (refused); a reporter changes nothing
- Keep it removes the 3 reports and shows it again

Not checked: the live URL.

**Team check (2026-11-08, localhost):** on the place page the writer sees "Hidden while the team reviews it."; other travelers do not see the review at all. On Reports the review shows "3 reports" and "Hidden".

**Team check (2026-11-08):** a review with two reports stays showing; Keep it was confirmed in ticket 109 and in the rolled-back test.
