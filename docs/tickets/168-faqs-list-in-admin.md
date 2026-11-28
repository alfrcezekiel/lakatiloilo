# 168 — FAQs list in /admin

**What to build:** The Lakat Iloilo team gets an **FAQs** screen in the
admin dashboard. It lists every question, grouped by topic (New to
Iloilo, About Lakat Iloilo, Finding the right place) in its order, each
with a Shown or Hidden label, and a counter "0 of 12 shown" with the
hint "6 to 12 questions works best". The questions are kept in a new
faqs table in the database, which starts with 10 hidden starter
questions so the live site has them too.

**Blocked by:** None

**Status:** checked by the team on localhost (2026-11-28); waiting for the live URL

- [x] A migration adds the faqs table (question, answer, topic, position,
      shown or hidden, dates) with Row Level Security on: anyone may read
      the shown questions, only admins may read hidden ones and add, edit
      or delete; the backend's read-only login can read it
- [x] The same migration adds the 10 starter questions from the spec,
      hidden, with answers the team can correct
- [x] The migration replays cleanly on the local database, and a check
      inside a rolled-back transaction shows a logged-out visitor sees
      no hidden question and cannot add one
- [x] "FAQs" in the dashboard sidebar (and the phone menu) opens the
      screen; a non-admin gets the site's "not found" page, as on every
      other admin screen
- [x] The screen shows the questions by topic with their labels and the
      "N of 12 shown" counter; it reads well at 375, 768, 1024 and 1440 px
- [ ] Works on the live URL: the team signs in and sees the 10 starter
      questions on /admin/faqs

**Progress (2026-11-28):** built and checked on localhost only.
- Checked: the migration replays with `npm run db:reset`; in rolled-back
  transactions a logged-out visitor and a non-admin traveler see 0 of the
  10 hidden questions and cannot add or change one, an admin sees all 10,
  a 13th shown question is refused with the plain message, and a
  151-character question is refused. GET /v1/admin/faqs answers 401 with
  no login and with a fake login (curl); the API tests also cover a
  traveler's 403. The screen shows the 10 starter questions with no
  sideways scrolling at 375, 768, 1024 and 1440 px.
- Not checked: the backend's own login reading the table (the local
  database won't let the test switch to it; ticket 170's public endpoint
  will use it), and anything on the live URL. The migration reaches the
  hosted database only through the Deploy workflow after a push.
- Built early: the 12-shown rule is already in the database (it belongs
  to the same table); ticket 169 adds the form and the backend message.
