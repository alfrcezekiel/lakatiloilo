# 89 — Reviews update live on a detail page

**What to build:** On an open destination or accommodation page, other travelers' new, edited and deleted reviews, star ratings, Helpful marks, replies and photos appear by themselves within a few seconds, and the average rating follows, with no reload. Supabase Realtime is only the doorbell ("a review, like or reply changed"); the page then asks the backend for the place's reviews again. A review or reply being typed, an open Report pop-up and a delete confirm step stay as they are.

A numbered SQL file adds destinations, accommodations, reviews, review_likes and review_replies to Supabase's Realtime list. review_reports is not added. Row Level Security does not change.

**Blocked by:** None

**Status:** done

- [x] A numbered SQL file adds the five tables (not review_reports) to the supabase_realtime publication, with check queries; Row Level Security and policies unchanged. The team has run it in the Supabase SQL Editor
- [x] The browser listens to Realtime only as a signal and never uses the rows it sends; data still comes from GET /v1/reviews
- [x] A review, reply, photo or Helpful mark from a second account shows on an open detail page in another browser within a few seconds; editing or deleting it updates there too, with the average rating
- [x] A review or reply being typed, an open Report pop-up and a delete confirm step are kept when an update arrives
- [x] The listener stops when the traveler leaves the page (no build-up of listeners)
- [x] Works on the live URL

**Progress (2026-11-02):** supabase/sql/029-realtime-signals.sql adds destinations, accommodations, reviews, review_likes and review_replies to the supabase_realtime publication (each only if missing; not review_reports). Row Level Security, policies and grants are unchanged. The team ran it in the Supabase SQL Editor ("it worked").

Website: a small doorbell helper listens to Supabase Realtime for "a row in one of these tables changed" (only the five tables are allowed by its type; review_reports cannot be named). Several changes within half a second ring once. It never uses the rows Realtime sends. The place reviews wrapper listens to reviews, review_likes and review_replies once per detail page; on a ring it asks the backend for this place's reviews again (TanStack Query), so the list, the average rating, Helpful counts, replies and photos update. Open forms, pop-ups and confirm steps live in components that stay on screen, so they are kept. Realtime connects with the publishable key (the website keeps the login itself), which may read all five tables. It listens to every review, like and reply, not only this place's, because Realtime cannot say which place a deleted row belonged to; each ring is one small request.

Checked:
- Browser, on the team's running website: on a detail page the Supabase Realtime connection opened, the page joined one channel for reviews, review_likes and review_replies, and Supabase answered "Subscribed to PostgreSQL" (so 029 worked). Leaving for the home page closed the channel; the home page opens none; opening another detail page joined a new one. (In development React opens, closes and reopens it once; the live site opens it once.)
- Website type-check, lint and `npm run build` pass.

Not checked: a real change arriving. That needs a review, reply or Helpful mark written by a real account, and the team tests real logins; nothing was written to the hosted database. Also the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** in two browsers with two real accounts, new, edited and deleted reviews, replies, photos and Helpful marks showed in the other browser within a few seconds without a reload, with the average rating; text being typed was kept. "Works on the live URL" stays open until ticket 89 is pushed and checked there.

**Checked by the team on the live URL (2026-11-02):** after the push (99ff1f5), on a laptop and a phone, changes showed on open pages without a reload.
