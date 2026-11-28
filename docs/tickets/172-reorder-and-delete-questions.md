# 172 — Reorder and delete questions

**What to build:** On /admin/faqs each question gets Move up and Move
down arrows, to change its order within its topic, and **Delete**, with
a confirmation pop-up and then the dashboard's usual 8-second Undo.

**Blocked by:** 169

**Status:** checked by the team on localhost (2026-11-28); waiting for the live URL

- [x] Move up and Move down swap a question with its neighbour in the
      same topic; the first has no Move up and the last no Move down
- [x] The home page shows the new order (after a refresh until ticket 173)
- [x] Delete asks first, then removes the question; Undo within 8 seconds
      brings it back with the same details, topic and place
- [x] Deleted questions do not go to the Trash
- [x] A logged-out visitor and a non-admin traveler are refused by the
      move and delete endpoints (checked with curl)
- [ ] Works on the live URL: the team reorders a question, deletes one
      and undoes it

**Progress (2026-11-28):** built and checked on localhost only.
- Checked with curl (local backend and database, a temporary question):
  - Move up and Move down swapped it with its neighbour.
  - Down at the last, up at the first and another direction each got
    400 with a plain sentence.
  - Delete removed it for good, and the questions after it moved up one
    (1, 2, 3 again). Deleting it again got 404.
  - A local traveler who is not an admin got 403 for move and delete;
    no login and a fake login got 401.
- In the browser (local admin): Move up, then Move down put it back; the
  last question has no Move down, and the focus went back to its arrow.
  Delete asked first (Cancel focused), took it off the list, and Undo
  brought it back; 10 seconds later it was still in the database. Deleted
  again and left for 8 seconds, it was gone from the database. The row
  buttons sit 2 by 2 in equal columns on phones (320 and 375 px) and in
  one row from 768 px; nothing scrolls sideways.
- How Undo works: like every delete on the dashboard, the website waits
  8 seconds before sending it, so Undo never reaches the backend (the
  spec's endpoint line now says so).
- The temporary question was removed; the team's questions are in their
  own order.
- Not checked: the home page's new order after a move (the same table
  and order as /admin/faqs, but not opened), and anything on the live
  URL.

**Team check (2026-11-28):** the team verified reordering on localhost
and asked for every box except the live URL to be ticked (the "Not
checked" line above was written before the team's check).

**Code review (2026-11-28):** while a delete waits for its 8-second
Undo, the question is still in the database. The FAQs screen now counts
it in "N of 12 shown" (with "1 of them is waiting to be deleted"), the
form counts it towards the 12, and its topic's Move up / Move down wait
until the Undo is over, so a move never swaps with a question the screen
no longer shows.
