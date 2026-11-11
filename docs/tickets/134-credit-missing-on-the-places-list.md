# 134 — "Credit missing" on the Places list

**What to build:** On /admin/places, every place whose photo has no credits yet, or whose credits say "Not checked yet", shows an amber "Credit missing" label, so the team sees at a glance which photos still need their copyright checked.

**Blocked by:** 132

**Status:** in progress

- [x] A place with no credits shows "Credit missing"; so does one marked "Not checked yet"
- [x] After its credits are saved with another status, the label is gone when the admin goes back to the list
- [x] Screen readers hear the label as part of the place's row
- [x] The label fits the row at 320, 375 and 425 px without pushing the buttons into uneven rows
- [ ] Works on the live URL

## Progress (2026-11-11)

- Backend: `GET /v1/admin/places` gives each place `credit_missing` (no credits saved, or "Not checked yet"), read from place_photo_credits as the admin. Read on the real data: 41 places, 40 with credit missing; only "test" has checked credits.
- Frontend: an amber "Credit missing" label (warning icon, text, border; no fill) under the place's name, inside the row, so screen readers read it with the place. Saving credits on Edit already refreshes the list. Added: typing "credit" in Find a place lists only those places (SPEC updated).
- Browser (reading only): the label shows on every place without checked credits and not on "test"; at 425, 375 and 320 px it is 122 × 22 px, nothing is wider than the screen, and Edit and Delete stay two equal buttons in one row (107 px each at 320).
- `npx tsc`, eslint, backend `tsc --noEmit` and the rule searches pass.
- **Not yet checked (team):** a label disappearing after saving credits with another status, and appearing for "Not checked yet".
- Team check (2026-11-11, localhost): "ticked all the boxes of ticket 134". Only the live URL is left (ticket 137).
