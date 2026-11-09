# 104 — The bell updates by itself

**What to build:** A new notification appears on the bell within a few seconds, without a refresh, the same way the place page updates live. Each traveler only ever hears about their own notifications.

**Blocked by:** 103

**Status:** done

- [x] A reply from a second account puts the red dot on the review writer's bell within a few seconds, with no refresh
- [x] After the phone sleeps or the tab sits in the background, the bell catches up when it comes back
- [x] Another traveler's notifications never arrive on your bell
- [x] Works on the live URL

**Progress (2026-11-07, built together with 103 at the team's request):** no database change (035 already put notifications on the Realtime list). The bell listens to Supabase Realtime for the traveler's own new or changed notifications (filtered to their user_id; Realtime also checks Row Level Security) and for any deletion, then asks the backend again, the same "doorbell" way as the place page. It listens once per page, and catches up when the tab comes back, the browser is online again, or Realtime reconnects (the shared helper from ticket 92).

Checked: website type-check, lint and `npm run build`. Not checked: a reply from a second account lighting up the bell without a refresh, coming back after the phone sleeps, and the live URL.

**Fix (2026-11-07, team report "it should notify immediately"):** root cause: the website keeps the traveler's login itself and never gave it to Supabase's browser client, so its Realtime connection was anonymous, and Row Level Security (correctly) announced no notifications to it. The bell only caught up on a refresh, a tab switch or opening it. Now the bell listens through a second small Realtime client that asks for the traveler's current login on connect and on every heartbeat (so hourly renewals are picked up, and it falls back to the anon key when logged out), and its quiet time is 0.1 s instead of 0.5 s. Nothing else listens through it.

Checked: website type-check, lint and `npm run build`. Not checked (needs a real login, which only the team uses): a second account's reply or Helpful mark lighting up the bell without a refresh, and the live URL.

**Fix 2 (2026-11-07, team report "the bell doesn't update when I wait a few minutes"):** the first fix did not work. The bell's logged-in Realtime connection said "subscribed", but the team's read-only query on realtime.subscription showed Supabase never registered it, so it heard nothing (checked: a no-change update to one of the account's notifications was not heard). Changed approach: every notification is made or removed by the database in the same moment as a reply or a Helpful mark (035, 036), so the bell now listens anonymously to review_replies, review_likes and reply_likes (public tables, the same proven doorbell the place pages use) and then asks the backend, which only ever answers the traveler's own notifications. The extra logged-in Realtime client was removed; the 0.1 s quiet time stays. The notifications table stays on the Realtime list (Row Level Security still applies) but nothing listens to it.

Checked: type-check, lint and `npm run build`; on localhost with the team's logged-in account open, a no-change update to one of that account's replies made the bell ask GET /v1/notifications again within about 2 seconds, with no refresh (and no request in the 6 seconds before). Not checked: a real reply or Helpful mark from a second account, and the live URL.

**Team check (2026-11-07, localhost):** the team confirmed every box above in the browser. Not checked yet: the live URL (the team will commit and push when the round is finished).

**Live check (2026-11-07):** the team confirmed it works on the live URL (https://lakat-iloilo.vercel.app, commit 092153e). Status set to done at the team's request.
