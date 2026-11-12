# 126 — Live Reviews and Reports screens

**What to build:** The Reviews and Reports screens update by themselves within a few seconds when reviews, replies, likes, photos, hiding or reports change, without a reload. The search text, the filter, open replies, an open likes list and a "Yes, delete" step are kept.

**Blocked by:** 123

**Status:** done

- [x] With Reviews open, a review posted, hidden or reported from another window shows within a few seconds
- [x] With Reports open, a new report shows within a few seconds
- [x] The search text, the chosen filter and open panels are kept when an update arrives
- [x] review_reports is still not on the Realtime list
- [x] Works on the live URL

## Progress (2026-11-11)

Built early, after the team's report on ticket 125 (a traveler's Helpful mark did not show on the dashboard without a reload).

- Reviews screen (`AdminReviews.tsx`): listens to reviews, review_replies, review_likes, reply_likes, review_photos, review_visibility_signals and report_signals; on any change it asks the backend again for the loaded review pages, open replies and open Helpful lists. Realtime is only the doorbell; review_reports is not listened to (still not on the Realtime list).
- Reports screen (`AdminReports.tsx`): listens to report_signals, reviews, review_visibility_signals and review_photos, then asks for the reports again.
- Faster: several changes close together ring once 0.2 s after the last one (was 0.5 s) on Reviews, Reports, Overview and the place pages' reviews.
- Kept while an update arrives: the search text and filter (screen state), open replies, open Helpful lists and an open pop-up (they live in the cards, which stay on screen).
- Checked in the browser with the team's admin login: going Overview → Reviews → Reports, the Reviews screen joined a Realtime channel for its 7 tables and Reports for its 4, Supabase answered "ok" to every join, no errors (each join shows twice only because the development server starts components twice; the live site joins once). `npx tsc`, eslint and `npm run build` pass.
- Team check (2026-11-11, localhost, two windows): with /admin/reviews open, the admin removed Gehleeyaaa's Helpful mark; in another window a traveler marked a review on Hotel Del Rio's page Helpful; the dashboard "synchronized in a few seconds" without a reload.
- Team check (2026-11-11, localhost): "ticked the tickets boxes of 125 and 126." review_reports is still not on the Realtime list (checked 2026-11-11: the supabase_realtime publication lists destinations, accommodations, reviews, review_likes, review_replies, reply_likes, notifications, review_visibility_signals, review_photos, report_signals and place_categories).
- **Not yet checked:** the live URL.
