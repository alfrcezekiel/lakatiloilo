# 99 — Photos on the traveler's profile

**What to build:** On any traveler's profile, a review with a photo shows it under the review's text — the same small picture as on the place page — and clicking it opens it larger. Reviews without a photo look the same as today. Everyone sees the photos, logged in or not, including on the traveler's own profile. The backend's traveler profile answer carries each review's photo address. No database changes: review photos are already public.

Added on 2026-11-06 at the team's request (spec: Profile & replies round, screen 25 "Photos on the profile", user story 38).

**Blocked by:** None

**Status:** done

- [x] A profile review with a photo shows it, and clicking it opens it larger
- [x] Reviews without a photo look the same as before
- [x] The photo shows when logged out, and on the traveler's own profile
- [x] Tidy at phone width (375 px) and on a laptop
- [x] Works on the live URL

**Progress (2026-11-06):** the backend's traveler profile (GET /v1/travelers/:id) now carries each review's photo_url (its public address, or null), worked out the same way as GET /v1/reviews; it never sends where the photo is kept in Storage. The profile page shows the photo under the review's text with the same photo component as the place page (click to open larger; Escape, Close or the dim background closes it). No database or SQL changes.

Checked:
- curl on the team's backend (port 5000): three travelers with photos answer photo_url addresses in the review-photos bucket for exactly the reviews that have one, and null for the others; a traveler with no photos answers null on every review.
- The profile page on localhost:3000, logged out, answers 200 and its HTML holds all four photo addresses of a traveler with four photo reviews.
- Backend type-check and lint, website type-check, lint and `npm run build` pass.

**Team check (2026-11-06):** the team opened a traveler's profile on localhost:3000 and the uploaded photos showed under that traveler's reviews.

Then: clicking a photo opened it larger with the Close button; a profile whose reviews mostly have no photo looked as before; logged out, the photos still showed; at 375 px it looked tidy.

At laptop width the photos looked the same as at 375 px: a small picture inside the card.

Logged in on their own profile, the team saw the photo under their review together with the Edit profile button.

Not checked yet: the live URL.

**Live check (2026-11-06):** the team confirmed it works on the live URL (https://lakat-iloilo.vercel.app, commit f8e823a). Status set to done at the team's request.
