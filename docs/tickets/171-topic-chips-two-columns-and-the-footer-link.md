# 171 — Topic chips, two columns and the footer link

**What to build:** The FAQs section gets its full layout. On a laptop
the left column stays in place while the traveler scrolls: the heading,
one short line, and topic chips with a count on each — All, New to
Iloilo, About Lakat Iloilo, Finding the right place. The right column
is the accordion. On phones the columns stack. The footer gets an
**FAQs** link.

**Blocked by:** 170

**Status:** checked by the team on localhost (2026-11-28); waiting for the live URL

- [x] Picking a chip shows only that topic's questions; All shows every
      one; each chip's count matches what it shows
- [x] A topic with no shown questions has no chip
- [x] On phones the chips sit in a grid of equal columns, never wrapping
      into uneven rows, and every chip is at least 44 px tall
- [x] The footer's FAQs link, next to Home, About Iloilo, Features and
      Explore, scrolls to the section (its address is /#faq)
- [x] Nothing scrolls sideways at 320, 375, 425, 768, 1024 and 1440 px
      (measured, not only looked at)
- [ ] Works on the live URL: the team tries every chip on a laptop and a
      phone, and the footer link

**Progress (2026-11-28):** built and checked on localhost only.
- Checked in the browser (home page, local data with 9 shown questions):
  the chips read All 9, New to Iloilo 3, About Lakat Iloilo 4, Finding
  the right place 2. Clicking About Lakat Iloilo showed only its 4
  questions, numbered 01 to 04. The footer's FAQs link is there, and
  opening /#faq puts the section 80 px from the top, under the navbar.
  On a laptop the left column stays at 96 px while the questions scroll
  past.
- Measured at 320, 375, 425, 768, 1024 and 1440 px: nothing scrolls
  sideways. Phones get 2 equal columns of chips (140, 168 and 193 px
  wide); 768 px gets one row on one line; 1024 px and up get two columns
  with the chips as a list. Every chip is at least 44 px tall.
- Tests: a chip per topic with shown questions and its count; picking a
  chip, then All; falling back to All when a topic loses its last shown
  question; the footer link shows only with the section.
- Not checked: the footer link's smooth glide (the browser pane was
  hidden and drew no frames; the same target with an instant jump lands
  correctly), and anything on the live URL.
