# 84 — Replies without the white box

**What to build:** Replies under a review lose their pale white background and sit directly on the review card, set apart only by a thin line down their left side. Everything else about a reply (name linking to the profile, traveler type tag, date, text, Delete for your own) looks and works as before. No data changes.

**Blocked by:** None

**Status:** todo

- [x] No reply has a pale box behind it; each has a thin left line instead
- [x] Names, tags, dates and text stay easy to read on both the teal and the blue detail pages
- [x] The Reply button, the reply form and Delete look and work as before
- [x] Looks tidy on a phone (375 px) and a laptop
- [x] Works on the live URL

**Progress (2026-11-02):** each reply under a review lost its pale white box (rounded, 5% white background) and now has a thin 2 px line down its left side (25% white) instead, with the same text, Reply button, form and Delete as before. One line changed in the replies component.

Checked:
- Browser, against the team's running website and backend (real replies, read only, no login): on a destination page with 8 replies, every reply has no background and a 2 px left line; screenshot taken on a laptop. At 375 px nothing reaches past the screen edge (rightmost reply edge 338 px).
- Website type-check, lint and `npm run build` pass.

Not checked: the blue accommodation pages (no accommodation has replies yet; the same white-on-colour styles are used there), the Reply form and Delete with a real login (the team tests real logins), and the live URL (not pushed yet).

**Confirmed by the team (2026-11-02):** checked and ticked. "Works on the live URL" stays open until ticket 84 is pushed and checked there.

**Checked by the team on the live URL (2026-11-02):** the threaded replies round checklist passed after the push (1c3170c).
