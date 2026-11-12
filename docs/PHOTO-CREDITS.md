# Photo credits

Every place photo on Lakat Iloilo belongs to someone. We may only show it
when its owner's licence or permission allows it, and we credit the
photographer. Since the photo credits round (tickets 132–138, 2026-11-11)
the team records this on the dashboard.

## Crediting a place photo (the dashboard)

On **/admin/places**, open **Edit** on a place (or **Add a place**). Below the
photo is the **Photo credits and copyright** box:

| Field | Required | What to write |
|---|---|---|
| Photographer | yes | Their name or username |
| Publisher / website | no | Where the photo was published, e.g. Wikimedia Commons |
| Original photo URL | no | The photo's own page, starting with `https://` |
| Copyright licence | yes | CC BY 4.0, CC BY-SA 4.0, CC0 / Public domain, All rights reserved, Our team's own photo, or Other |
| Authorization status | yes | Allowed by its licence, Permission from the owner, Our team's own photo, or Not checked yet |
| Attribution / photo credits | yes | The line shown on the site; it fills itself in, and you can change it |

- **"All rights reserved" needs "Permission from the owner".** Ask the owner
  first; the dashboard and the database refuse it otherwise.
- **"Not checked yet" hides the photo from travelers.** Until the status is
  anything else, the home page cards, Featured and Trending and the place
  page show the Lakat Iloilo splash art instead, and no credit line. The
  photo stays uploaded, so choosing an allowed status shows it at once.
- A place with no credits, or "Not checked yet", shows **Credit missing** on
  /admin/places. Type "credit" in Find a place to list only those.
- Replacing a photo keeps its credits; the box then says **"Check these
  credits: the photo was changed."** until you save them again.

## Where travelers see credits

- Under the photo on the place's page: the credit line, linked to the
  original photo when there is a URL.
- On **/credits** (footer: "Photo credits"): under "Place photos", every
  allowed credit saved on the dashboard; under "From Wikimedia Commons", the
  older list kept in `src/lib/photo-credits.ts`.

Travelers never see the authorization status. Only admins and the backend
may read the credits table (supabase/sql/054 and 055).

## The splash art

`public/splash-desktop-1920x1080.webp` (1920 × 1080, the team's art; set in
`src/lib/splash.ts`). It fills the same frame as a photo would.

## Still to do

Most places have no credits saved yet, so they show the splash art until
the team credits them. Moving the 30 Wikimedia credits from
`src/lib/photo-credits.ts` into the dashboard is parked in `docs/LATER.md`.
The home page's hero background is still a stock photo from Unsplash, whose
licence needs no credit.
