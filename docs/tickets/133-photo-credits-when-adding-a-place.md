# 133 — Photo credits when adding a place

**What to build:** On /admin/places/new, the same "Photo credits and copyright" box sits below the photo upload. "Add place" works only when the required credit fields are filled in, and the place and its credits are saved together. The "place added" card shows the new place's credit line.

**Blocked by:** 132

**Status:** in progress

- [x] The Add form shows the credits box below the photo, with the same fields, self-filling credit line and checks as Edit
- [x] "Add place" is refused with a plain message while Photographer, Copyright licence or Authorization status is missing, or "All rights reserved" lacks "Permission from the owner"
- [x] If the credits are refused, nothing is saved: no place, no photo
- [x] The "place added" card shows the credit line
- [x] Works with the keyboard alone, at 320, 375 and 425 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-11)

- Backend: `POST /v1/admin/places/:type` now also takes the six credit fields in the same form. They are checked (plain sentences, as on Edit) before the photo is uploaded, and saved in the same transaction as the place; if the database refuses them, neither is kept and the photo is deleted again ("Please check the photo credits and try again.").
- Frontend: the "Photo credits and copyright" box is on /admin/places/new below the photo, with the same fields, self-filling line and checks as Edit; credits are required. "Add place" with nothing filled in now marks every missing field at once (photo, credits and the other fields) and puts the focus on the first one. The "place added" card shows the credit line.
- Checked, nothing added:
  - Browser, every save request blocked in the tab: the box sits between the photo and Name; empty form → all four required credit messages show and the focus goes to the photo; with a test photo chosen → focus goes to Photographer; filled in → the line reads "Photo: Test Photographer / Test Site, CC BY 4.0" and "Add place" would send the place, the six credit fields and the photo in one request.
  - The backend's own add-a-place code on the real database (rolled back, photo storage replaced by a stand-in): All rights reserved + Allowed by its licence → 400 "Please check the photo credits and try again.", no place kept, photo deleted again; good credits → place and credits saved, credit line read back.
- `npx tsc`, eslint, backend `tsc --noEmit` and the rule searches pass; POST logged out → 401.
- **Not yet checked (team):** really adding a place with credits and seeing them on Edit, the credit line on the "place added" card, keyboard alone, 320–425 px.
- Team check (2026-11-11, localhost): "ticked all the boxes of ticket 133". Only the live URL is left (ticket 137).
