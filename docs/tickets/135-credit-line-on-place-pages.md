# 135 — Credit line on place pages

**What to build:** On each destination and accommodation page, travelers see a small credit line under the photo, e.g. "Photo: Riyan0721 / Wikimedia Commons, CC BY-SA 4.0", linking to the original photo when there is a URL. A place with no credits shows no line. Travelers never see the authorization status.

**Blocked by:** 132

**Status:** done

- [x] The credit line shows under the photo on a destination page and an accommodation page that have credits
- [x] It links to the original photo (opens in a new tab) only when there is an original URL
- [x] A place without credits shows no line and no empty space
- [x] The public answer for a place carries the credit line, licence and link, never the authorization status (checked with curl)
- [x] Readable (WCAG AA contrast) on the photo page at 320 px and on a laptop
- [x] Works on the live URL

## Progress (2026-11-11)

- Backend: `GET /v1/destinations/:id` and `GET /v1/accommodations/:id` now carry `photo_credit` ({ credit_line, licence, source_url }, or null), read through the backend's own database login. curl: "test" and Diversion 21 Hotel answer their line; Breakthrough Restaurant answers null; neither answer contains the authorization status.
- Frontend: a small line with a camera icon at the foot of the photo, under the address ("Photo: … / …, licence"). With an original URL it is a link that opens in a new tab (rel="noopener noreferrer"; screen readers also hear "opens the original photo in a new tab"); without one, plain text. No credits: no line, no space.
- Bug found and fixed while measuring: a credit line containing a long word without spaces (a pasted URL) ran off the screen (to 532 px at 320–425 px), because a flex row keeps a word whole. It now breaks anywhere (`min-w-0 wrap-anywhere`); remeasured at 425, 375 and 320 px: one line inside the screen, nothing wider.
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` and the rule searches pass.
- **Not yet checked (team):** reading the line on a few photos (light and dark), and the link opening the original.
- Team check (2026-11-11, localhost): "it works efficiently in local machine. ticked the boxes of ticket 135". Only the live URL is left (ticket 137).
