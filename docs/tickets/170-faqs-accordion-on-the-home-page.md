# 170 — FAQs accordion on the home page

**What to build:** The home page gains a "Frequently asked questions"
section after Accommodations, before the footer. Each shown question is
a glass card with a number badge ("01") and a chevron; clicking it opens
its answer, which slides open, and closes the one that was open. The
open card gets an amber accent line and a brighter border.

**Blocked by:** 169

**Status:** checked by the team on localhost (2026-11-28); waiting for the live URL

- [x] A public endpoint answers only the shown questions, in order; a
      logged-out visitor cannot read a hidden one through it
- [x] The section shows every shown question; only one answer is open at
      a time; answers keep the team's paragraphs
- [x] Glass look without blur and without a white tint on hover (the
      frontend rules); hover brightens the border
- [x] Every question is a real button that says whether it is open; Tab,
      Enter and Space open and close it, Up and Down move between
      questions, Home and End go to the first and last; the keyboard
      outline stays visible
- [x] With "reduce motion" on, answers appear without sliding
- [x] While loading, the title and 4 skeleton cards show; with no shown
      question the section is hidden
- [ ] Works on the live URL: the team opens and closes questions with the
      mouse and with the keyboard

**Progress (2026-11-28):** built and checked on localhost only.
- Checked: GET /v1/faqs with no login answers only the shown questions,
  in topic order, with id, question, answer and topic (curl). The
  backend's own login (lakat_api) sees 6 of the 10 questions, exactly the
  shown ones, even without the "where is_shown" (Row Level Security; the
  check ticket 168 could not do).
- In the browser (home page, local data): the section sits after
  Accommodations and before the footer, all closed at first. A click
  opens one and closes the other; Tab skips a closed answer; End, Down
  (back to the first), Up and Home move between questions; Enter and
  Space open and close; the keyboard outline is a solid white line and a
  mouse click leaves none. The reduce-motion rule is in the page's CSS.
  Nothing scrolls sideways at 320, 375, 768, 1024 and 1440 px; every
  question is 64 px tall.
- Fixed while checking: the keyboard outline was invisible at first
  (Tailwind's "focus:outline-none" also hid the focus-visible one).
- The team watched the slide and the colours on localhost (2026-11-28).
- **Change (2026-11-28, team request):** the FAQs sit inside the home
  page's last teal-to-emerald section with the place lists, so there is
  one background and no colour seam.
- Not checked: anything on the live URL.
