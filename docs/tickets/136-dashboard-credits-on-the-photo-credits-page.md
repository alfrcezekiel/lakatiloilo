# 136 — Dashboard credits on the Photo credits page

**What to build:** The Photo credits page (/credits, from the footer) also lists every credit saved on the dashboard: the place's name, the credit line, the licence and a link to the original, next to the existing Wikimedia list.

**Blocked by:** 132

**Status:** in progress

- [x] The page lists each dashboard credit with its place name, credit line, licence and, when there is one, a link to the original
- [x] The existing Wikimedia credits still show as before
- [x] A credit saved on the dashboard appears on the page after a reload; a deleted place's credit is gone
- [x] Never shows the authorization status
- [x] Works at 320 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-11)

- Backend: new public `GET /v1/photo-credits` (no login): every saved credit with its place's name, type and id, credit line, licence and link, by place name; read through the backend's own database login; never the authorization status. curl: Diversion 21 Hotel and test.
- Frontend: /credits now asks for them on every visit (so a new credit shows after a reload) and lists them first under "Place photos": the place's name (a link to its page), the credit line, "Licence: …" and "Original photo" (new tab) when there is a link. The existing Wikimedia list follows under "From Wikimedia Commons", unchanged. If the credits cannot be read, the Wikimedia list still shows with "Some photo credits could not be loaded right now." The intro sentence now covers both lists.
- Browser (reading only): both lists show; at 425, 375 and 320 px nothing is wider than the screen (the long test line with a pasted URL wraps).
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` and the rule searches pass. The page's older Back to Home button had a `backdrop-blur-md` on the plain gradient (against the frontend rules); removed.
- **Not yet checked (team):** a credit saved on the dashboard appearing after a reload, and a deleted place's credit disappearing.
- Team check (2026-11-11, localhost): "ticked all the boxes of ticket 136". Only the live URL is left (ticket 137).
