# 83 — Review extras round: final check

**What to build:** The team walks through the "Review extras round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Blocked by:** 79, 80, 81, 82

**Status:** todo

- [ ] Every item in the "Review extras round" checklist works on the live URL
- [ ] Existing reviews, Helpful likes, profiles, the profile dropdown, ratings on cards and log-in still work
- [ ] /code-review has been run on the round and its findings handled
- [ ] Works on the live URL

**Progress (2026-11-02):** /code-review ran on the round (from ade7563, the last push: tickets 79–82 and SQL 025–027, all uncommitted), both axes one after the other.

Spec: everything in screen 21, the review extras Data section (review_replies, review_reports, photo_path, the review-photos bucket) and the endpoint lines is built. One small wording difference: deleting someone else's reply answers "We couldn't find that reply among yours. Please log in again and try." (matching the reviews message), where the spec line ends after "among yours."

Safety and Standards: no must-fix findings. review_replies has Row Level Security on with four policies, review_reports with its one insert policy (nobody may read, edit or delete through the app, on purpose), and review-photos has four Storage policies; all were proved (replies and reports through the backend's own login, rolled back; Storage by the team in the SQL Editor). No secrets, no console.log, no raw HTML, no new browser-visible settings, no request values glued into SQL; the publishable key only; the build passes. Judgement calls left for the team:
1. reviews.service.ts is now 368 lines (the photo steps were added to creating, editing and deleting reviews); the split parked in LATER.md is more worth doing now.
2. A review with a photo asks Supabase Auth who the traveler is twice (once to upload, once to save).
3. Deleting a review also deletes its reports (as the spec says), so a reported review's writer can make the report disappear by deleting the review.
4. If deleting an old photo from Storage fails, the file is left behind and only logged.

Not done yet: the team's walk-through of the "Review extras round" checklist on the live URL (tickets 79–82 are not pushed yet).

**Review findings handled (2026-11-02, team request: fix wording, park the rest):**
- Spec: the DELETE /v1/replies/:id line now gives the real 404 message ("…among yours. Please log in again and try.", like the reviews message).
- Parked in docs/LATER.md: (1) the reviews service split, updated for its new size (about 370 lines) and to move the photo steps into the review photos service too; (2) one Supabase login check per review with a photo instead of two; (3) keeping reports when a review is deleted (a team decision and a SQL change); (4) tidying up photos left behind in Storage if a delete fails.
No code changed.
