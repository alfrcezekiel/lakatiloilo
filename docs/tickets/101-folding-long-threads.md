# 101 — Folding long threads

**What to build:** Every reply with answers starts folded, showing "Show replies"; each level opens on its own. An open reply with more than 3 answers shows the newest 3 and a "Show N more replies" link that opens the rest. Every reply with answers gets a "Hide replies" / "Show replies" link that folds and unfolds the thread under it. A new answer always opens its thread, so the traveler sees it.

**Blocked by:** 100

**Status:** todo

- [x] On load, every reply with answers shows "Show replies" and its answers are hidden; opening one shows its answers, whose own threads stay folded
- [x] An open reply with more than 3 answers shows the newest 3 and "Show N more replies"; clicking it shows the rest
- [x] "Hide replies" folds a thread and "Show replies" unfolds it, including under a deleted reply
- [x] Posting an answer, or one arriving live, opens its thread
- [x] Works at 375 px and on a laptop
- [ ] Works on the live URL

**Progress (2026-11-06):** built on the website only (no database or backend change). A reply with more than 3 answers shows the newest 3 and "Show N more replies"; every reply with answers, including a deleted one, has "Hide replies" / "Show replies" (with aria-expanded for screen readers). A folded thread remembers when its newest answer was posted, so a newer answer (posted here or arriving live) opens it again, while deleting an answer keeps it folded.

Checked: website type-check, lint and `npm run build`; on localhost (laptop width) on Jaro Cathedral, the page shows 5 "Hide replies" links, clicking the first folds its whole thread and "Show replies" opens it again. Not checked: "Show N more replies" (no reply has more than 3 answers yet), a new answer opening a folded thread, 375 px (the browser window would not resize), and the live URL.

**Change (2026-11-07, team request): threads start folded.** On first load every reply with answers shows "Show replies" instead of its answers, so a review shows only its direct replies; opening one shows its answers, and their own threads stay folded until opened, to invite travelers to open the conversation. A new answer (posted, or arriving live) still opens its thread. docs/SPEC.md (screen 26 and the round's live checklist) updated to match.

Checked: type-check and lint; on localhost (Jaro Cathedral) the page loads with 2 "Show replies" and no answers showing; opening the first shows "Hide replies" and two folded "Show replies" under it, and opening one of those opens only that level. Not checked: "Show N more replies", a new answer opening a folded thread, 375 px, and the live URL.

**Team check (2026-11-07, localhost):** the team confirmed every box above in the browser. Not checked yet: the live URL (the team will commit and push when the round is finished).
