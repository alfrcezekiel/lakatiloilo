# 86 — Deep threads stay readable

**What to build:** Replies can go any number of levels deep, but the indent stops growing after 3 levels. A reply deeper than that starts with "Replying to <name>", naming the traveler it answers, so a long conversation stays readable on a phone.

**Blocked by:** 85

**Status:** todo

- [x] Levels 1 to 3 each move in a little more
- [x] Level 4 and deeper stay at the level-3 indent and start with "Replying to <name>"
- [x] At 375 px, five levels deep, no text is squeezed and nothing reaches past the screen edge
- [ ] Works on the live URL

**Progress (2026-11-02):** the replies component indents one step per level up to 3 levels. A level-3 reply's answers, and all answers below them, no longer nest inside it: they follow it in the same list, at the level-3 indent, in thread order, each starting with a small "↳ Replying to <name>" line naming the traveler it answers. Website only; no data or backend change.

Checked, in the browser with a pretend login and pretend backend answers (nothing sent to Supabase), on a pretend thread six levels deep plus a second level-3 answer:
- Laptop: levels 1, 2 and 3 start at 45, 65 and 85 px; levels 4, 5 and 6 stay at 85 px with "Replying to Maria", "Replying to Pretend Traveler" and "Replying to Jose Maria Dela Cruz Santos"; the second level-3 answer follows the deep ones without a "Replying to" line.
- 375 px: nothing reaches past the screen edge (rightmost edge 338 px); a level-5 reply is still 261 px wide, and a long name and a long text wrap.
- Answering the level-6 reply sent its id as parent_reply_id; the answer showed straight after it at the same indent with "Replying to Pretend Traveler".
- Website type-check, lint and `npm run build` pass.

Not checked: a real login (the team tests real logins) and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** with a real login, a thread 4 or more levels deep stops indenting at level 3 and shows the right "Replying to <name>" names, on a laptop and a phone. "Works on the live URL" stays open until ticket 86 is pushed and checked there.
