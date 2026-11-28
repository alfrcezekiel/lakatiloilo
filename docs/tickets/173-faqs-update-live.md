# 173 — FAQs update live, Other topics and the FAQs page

**What to build:** When the team adds, edits, reorders, shows, hides or
deletes a question, an open home page shows the change within a few
seconds, without a reload. Supabase Realtime is only the doorbell
("the faqs table changed"); the page then asks the backend again, as it
does for the places.

**Blocked by:** 170, 172

**Status:** checked by the team on localhost (2026-11-28); waiting for the live URL

- [x] A change in /admin/faqs reaches an open home page within a few
      seconds, in another tab and on another device
- [x] The scroll position, the chosen topic chip and the open question
      stay as they are (unless that question was hidden or deleted)
- [x] The page never uses the rows Realtime sends; hidden questions never
      reach a logged-out visitor's browser
- [x] **Other topic:** in the Add / Edit form, the Topic list ends with
      "Other…"; picking it shows a "New topic" box below it (2 to 40
      characters, with its own message when empty or too long). The new
      topic is saved with the question and then appears in the Topic list,
      the admin list, the home page chips and the FAQs page, after the
      three built-in topics, A to Z. Typing an existing topic's name uses
      that topic instead of making a second one
- [x] **FAQs page (/faqs):** every shown question grouped under its topic's
      heading, each topic an accordion like the home page's, with a link
      back home; the home FAQs section links to it. It updates live too
- [ ] Works on the live URL: the team edits a question on a laptop while
      the home page is open on a phone, adds a question with a new topic,
      and opens /faqs

**Change (2026-11-28, team request):** two additions to this ticket: an
"Other" topic choice in the FAQ form that shows a text box for a new
topic, and a new FAQs page at /faqs that shows the questions grouped by
topic. Custom topics need the database to accept topic names besides the
three built-in ones (a new migration).

**Progress (2026-11-28):** built and checked on localhost only.
- Database: two new migrations, applied to the local database with
  `npx supabase migration up` (not `db reset`, which would have wiped the
  team's local questions). Checked in rolled-back transactions: a typed
  topic such as "Beaches" is accepted; one with a space at the start, of
  1 character or of 41 is refused. One change to 6 rows rings faq_signals
  once; a visitor can read it but not write it; faqs stays off the
  Realtime list.
- Other topic (curl and the real form): "Zebra crossings" and
  "  Beaches  " were saved tidied; "beaches" joined "Beaches"; "new to
  iloilo" used the built-in topic; "B" got "Please write a topic of 2 to 40
  characters." In the form, Other showed the New topic box, and the new
  topic got its own section after the built-in ones.
- Live: with the home page open (About chip chosen, a question open),
  hiding one question and showing another through the backend changed the
  chips within 5 seconds, without a reload; the chip and the open
  question stayed. The same on /faqs: its Beaches section went away by
  itself.
- /faqs: the 4 topics in order with their questions; nothing scrolls
  sideways at 320, 375, 768, 1024 and 1440 px; topic links 2 by 2 on
  phones, at least 44 px tall.
- The temporary questions were removed; the team's local questions are
  as they were (12 of 13 shown).
- Not checked: `npm run db:reset` replaying every migration from empty
  (the CI "migrations" job runs it on the pull request, or the team can
  run it when losing local edits is fine), another device, and anything
  on the live URL.

**Change (2026-11-28, team request):** the /faqs page was redesigned for
easier reading and navigation: a header with how many answers and
topics; a topic menu with icons and counts (a sticky left column on a
laptop that marks the topic being read, a 2-column grid on phones); each
topic as a glass section with its icon and count; and a closing card
leading to the destinations and home. Checked on localhost: nothing
scrolls sideways at 320, 375, 425, 768, 1024 and 1440 px, every link and
button is at least 44 px tall, and the menu stays in place while the page
scrolls. Not checked in the browser: the menu following the scroll (the
browser pane was hidden and its page reports nothing on screen; a test
covers it).

**Change (2026-11-28, team request):** the closing card has no Back to
Home button any more (it stays at the top of the page); its "Explore
destinations" button sits in the middle of the card.

**Team check (2026-11-28):** the team verified the ticket on localhost
and asked for every box except the live URL to be ticked (the "Not
checked" lines above were written before the team's check).

**Code review (2026-11-28):**
- The home page's All list is ordered topic by topic in the chips'
  order, so typed topics can never be numbered differently from their
  chips.
- On tablets the chips stay in a grid of equal columns (up to 4 in one
  row; more keep the phone's 2 columns), so typed topics never wrap into
  uneven rows.
- Invisible control characters are taken out of the question, answer and
  topic (website and backend), so the database never refuses them with
  the wrong message.
- The database safety checks 08, 12 and 00 list faqs and faq_signals as
  meant to be public (faq_signals on Realtime), so they no longer report
  them as problems; run locally, they report 0 problems.
