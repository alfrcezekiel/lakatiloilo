# 169 — Add, edit, show and hide a question

**What to build:** On /admin/faqs the team can add a question and edit
any question in a glass form: Question (up to 150 characters), Answer
(up to 1000 characters; an empty line starts a new paragraph; the box
grows with the text), Topic, and a "Show on the home page" tick box.
At most 12 questions can be shown at once.

**Blocked by:** 168

**Status:** checked by the team on localhost (2026-11-28); waiting for the live URL

- [x] **Add a question** opens the empty form; a new question goes to the
      end of its topic
- [x] **Edit** opens the form filled in; saving updates the list and the
      Shown or Hidden label
- [x] Each box has a live character count, and its own plain message
      when it is empty or too long, in the form and from the backend
- [x] With 12 already shown, showing another is refused with "Only 12
      questions can show at once. Hide one first." — by the form, the
      backend and the database
- [x] A logged-out visitor and a traveler who is not an admin are refused
      by the add and edit endpoints (checked with curl: status codes and
      messages reported)
- [ ] Works on the live URL: the team corrects the starter questions and
      ticks 6 or more to show

**Progress (2026-11-28):** built and checked on localhost only.
- Checked: POST and PATCH /v1/admin/faqs on the local backend and
  database (curl, local seed admin). A new question went to the end of
  its topic. Edit moved one to another topic and closed the gap in the
  old one. An empty question and a 1001-character answer each got their
  own message with the box's name (400). A 13th shown question got 409
  "Only 12 questions can show at once. Hide one first." from the
  database's own rule. A bad or unknown id got 404. No login and a fake
  login got 401, and a local traveler who is not an admin got 403 "This
  page is for the Lakat Iloilo team." for add and edit.
- In the browser (local admin): Edit opened the form filled in, unticking
  "Show on the home page" and saving changed the counter to 11 of 12,
  and the focus went back to the Edit button. No sideways scrolling, and
  nothing wider than the pop-up, at 375, 768, 1024 and 1440 px; its
  buttons are 44 px tall.
- Tests: the form's checks, Add, the 12-shown refusal and a backend
  refusal shown under its box (frontend); the backend's checks, Add,
  Edit and the 409 (API).
- The local test questions and test traveler were removed afterwards.
- Not checked: anything on the live URL.
