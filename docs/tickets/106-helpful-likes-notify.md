# 106 — Helpful likes notify you

**What to build:** When another traveler marks a traveler's review or reply as Helpful, the database adds a notification for them: "Maria found your review of Bucari Little Baguio helpful" or "Juan found your reply on Hotel del Rio helpful". Never for your own review or reply. Removing the Helpful mark removes its notification, so marking on and off cannot flood someone's bell. They show in the same bell as replies (whenever the traveler is logged in, and live), and clicking one opens the place at that review and marks it read.

**Blocked by:** 102, 103, 104

**Status:** todo

- [x] A numbered SQL file adds the two new kinds and the triggers on Helpful likes; Row Level Security on notifications is unchanged; the team has run it in the Supabase SQL Editor
- [x] Marking someone's review Helpful from a second account puts "… found your review of … helpful" in their bell within a few seconds
- [x] Marking someone's reply Helpful puts "… found your reply on … helpful" in their bell
- [x] Removing the Helpful mark removes that notification; your own reviews and replies never notify you
- [x] Clicking one opens the place at that review and marks it read
- [ ] Works on the live URL

**Progress (2026-11-07):** added at the team's request and built; waiting for the team to run supabase/sql/036-helpful-likes-notify.sql. It adds the "review_like" and "reply_like" kinds, an actor_id column (who replied or liked), triggers on review_likes and reply_likes that add a notification for the writer (never for your own) and remove it again when the Helpful mark is removed. Row Level Security on notifications is unchanged. Backend and bell show "… found your review of … helpful" / "… found your reply on … helpful"; clicking, marking read and live updates work as for replies (tickets 103–104). docs/SPEC.md updated (screen 26, Data, live checklist; the "Later" line no longer parks Helpful notifications).

Checked: backend and website type-check, website lint and `npm run build`. Not checked: 036 run, the triggers (after 036, through the backend's login inside a rolled-back transaction), the bell in a browser, and the live URL.

**Team check (2026-11-07):** the team ran 036 and it worked. Proved through the backend's login inside one transaction that was rolled back (nothing kept), with two real accounts A and B: B marking A's review Helpful gives A one unread "review_like" with B's name (no reply); removing the mark takes it away again; the same for A's reply ("reply_like"); marking twice adds nothing; A cannot mark their own review or reply (refused by Row Level Security, so no notification); B reads 0 of A's notifications. Not checked yet: the bell in a browser (live, clicking), and the live URL.

**Team check (2026-11-07, localhost):** the team confirmed every box above in the browser: a Helpful mark notifies the writer, and removing it makes that notification disappear from the bell without a new one. Not checked yet: the live URL (the team will commit and push when the round is finished).
