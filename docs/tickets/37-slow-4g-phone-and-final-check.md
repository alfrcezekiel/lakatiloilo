# 37 — Slow 4G, phone and final check

**What to build:** Every item in the spec's "Loading skeletons round" checklist passes on the live site, checked with the browser set to "Slow 4G" and on a real phone.

**Blocked by:** 33, 34, 35, 36

**Status:** in progress (local checks pass; waiting for the push and a real-phone check)

- [ ] With the browser throttled to "Slow 4G", the home page shows the hero text and skeletons first, then real cards without jumping
- [x] Skeletons look tidy at phone width, with no sideways scrolling
- [x] With "reduce motion" turned on, no skeleton pulses
- [ ] Every item in the spec's "Loading skeletons round" checklist is ticked
- [ ] Works on the live URL, opened on a real phone by the team

**Local check notes:** on a load slowed by 5 seconds, the first screen moved 2px when the places arrived (layout shift score 0). Sections far down the page grow when they hold more than 3 places, because the skeleton shows 3 cards and the real list shows up to 6; that happens out of view while the page loads.
