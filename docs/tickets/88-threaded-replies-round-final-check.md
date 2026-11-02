# 88 — Threaded replies round: final check

**What to build:** The team walks through the "Threaded replies round (live URL)" checklist in the spec, on a laptop and on a phone, and ticks it off.

**Change (2026-11-02, team request):** before the walk-through, answers to a reply were changed to show newest first, so a new answer appears right under the reply it answers, with "Your reply is posted." under it. Replies to the review itself stay oldest first. Spec screen 23 and its checklist line are updated.

**Change (2026-11-02, team request):** answers at levels 2 and 3 get a curved line branching from the line of the reply they answer into their name row, so it is clear whose reply they answer. Deeper answers keep "Replying to <name>". Spec screen 23 and its checklist are updated.

**Blocked by:** 84, 85, 86, 87

**Status:** done (confirmed by the team on the live URL, 2026-11-02)

- [x] Every item in the "Threaded replies round" checklist works on the live URL
- [x] Reviews, photos, reports, Helpful likes, profiles and log-in still work
- [x] /code-review has been run on the round and its findings handled
- [x] Works on the live URL

**Progress (2026-11-02):** the change above is in the replies component. Answers to a reply are turned newest first (the backend still sends oldest first; replies to the review stay oldest first), and "Your reply is posted." shows under the reply just posted. After a delete it still shows at the bottom. Website only.

Checked: website type-check, lint and `npm run build` pass.

Not checked: the browser. The pane's copy of the detail page stayed on "Loading places" after a reload, twice, while the backend and the page answered in under a second with curl. So the browser check was stopped there, as the team rules ask, and needs the team on localhost with a real login. The live URL walk-through has not started (nothing pushed yet).

**Checked by the team on localhost (2026-11-02):** with a real login, answering a reply that already has answers puts the new answer directly under it with "Your reply is posted." under it; the review's own Reply button still adds at the bottom; the order stays after a refresh.

**Progress (2026-11-02, curved lines):** in the replies component, each answer at level 2 or 3 draws a small curve (12 px rounded corner) from the line of the reply it answers into its own name row. Level 4 and deeper keep "Replying to <name>" and no curve, because they sit beside the reply they answer. Website only.

Checked in the browser with the pane showing, logged out, on real threads the team made (Hotel del Rio, 4 levels): the curves start exactly on the parent's line (45 px) and end at the answer's own line (65 px), on the blue accommodation page, on a laptop and at 375 px (no overflow); the level-4 answer shows "Replying to tom_cruise" without a curve. Website type-check, lint and `npm run build` pass. The earlier "Loading places" problem was the browser pane being hidden (a hidden pane's page never finished its loading fade), not the app.

Not checked: the live URL (not pushed yet).

**Fix (2026-11-02, found by the team in a phone simulator):** on a phone, the whole Reviews area faded away while scrolling to the bottom or typing a reply. Cause: Reviews sits in one fade-in block (Reveal) that counted as "on screen" only while 15% of it was visible; threaded replies make it much taller than a phone screen, so at the bottom of the page (footer showing) or with the keyboard open, less than 15% showed and it faded out. Now the Reviews block stays visible while any part of it is on screen ("some"); other fade-ins keep the 15% rule. Website type-check, lint and `npm run build` pass.

Not checked: in the browser. The built-in browser stayed on the page's loading skeleton twice, although the dev server sent the full page in under a second, so the check was stopped as the team rules ask. Needs the team's phone simulator.

**Checked by the team in a phone simulator (2026-11-02):** after a hard refresh, the Reviews area and an open reply box stay visible while scrolling to the bottom and typing a reply.

**Checked by the team on the live URL (2026-11-02):** every item in the "Threaded replies round" checklist passed after the push (1c3170c). Still open: confirming reviews, photos, reports, Helpful likes, profiles and log-in still work, and /code-review on the round.

**Code review (2026-11-02, from 95c093f to 1c3170c, both axes in parallel):** no must-fix findings (Row Level Security unchanged, no secrets, no raw HTML, no SQL glued from input, no way to make a reply loop; the build passes).

**Review findings handled (2026-11-02, team request: fix 3 small, park the rest):**
- Fixed: a refused delete now shows its message next to that reply's confirm step, not inside a reply form open somewhere else (the two used to share one message). Checked in the browser with a pretend login and a pretend refusal: the message appeared only inside the reply that could not be deleted.
- Fixed: the spec's polish-round line now has a dated change note saying Reviews stays visible while any part of it is on screen, and the round's checklist has the phone line.
- Fixed: the ReviewReply entity comment lists the three columns travelers may send.
- Parked in docs/LATER.md ("From the threaded replies round code review"): a thread depth or reply limit and a rate limit, the message in a rare timing case, a project-specific error code instead of 22023, one way to check ids, splitting the replies component, keyboard focus after Cancel and Delete, and answers whose parent is gone. Also removed a repeated sentence in LATER.md.
- Website and backend type-checks, lint and `npm run build` pass.

**Confirmed by the team (2026-11-02):** after the review fixes were pushed (14eff40), reviews, photos, reports, Helpful likes, profiles and log-in all still work on the live URL. The threaded replies round is done.

**Follow-up review (2026-11-02, 14eff40):** no must-fix findings. The entity comment tidy was only half done (one 113-character line was left); it is now split into short lines. Comment only; backend type-check passes.
