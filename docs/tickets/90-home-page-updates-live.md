# 90 — Home page updates live

**What to build:** On an open home page, destinations and accommodations added, changed or removed in Supabase, and changed star ratings (from reviews written, edited or deleted anywhere), show on the cards by themselves within a few seconds, with no reload. Realtime is the doorbell; the page asks the backend again for places and ratings. The scroll position, the search box and the chosen category stay as they are.

**Blocked by:** 89

**Status:** done

- [x] Adding, changing and removing a destination and an accommodation in the Supabase Table Editor shows on an open home page within a few seconds
- [x] Writing, editing or deleting a review in another browser updates that place's star rating on an open home page
- [x] The scroll position, the search text and the chosen category are kept when an update arrives
- [x] Several changes at once cause one refresh, not one per change
- [x] Works on the live URL, on a laptop and a phone

**Progress (2026-11-02):** the home page uses the doorbell from ticket 89 for destinations, accommodations and reviews (reviews change the cards' star ratings). On a ring it asks the Next.js server to load places and ratings from the backend again (a server refresh); the page then updates the cards in place. If such a live refresh cannot reach the backend, the cards and ratings already on screen are kept instead of being emptied. Several changes within half a second cause one refresh (from ticket 89's helper). No SQL; Realtime list from 029.

Checked, in the browser on the team's running website:
- The home page joined one Realtime channel for destinations, accommodations and reviews, and Supabase answered "Subscribed to PostgreSQL"; going to a detail page closed it and opened the reviews channel instead.
- Triggering the same refresh the doorbell uses, after typing "Jaro" in the search box and scrolling to 1800 px: one request to the server, the scroll position, the search text and all 34 cards stayed, and no loading skeletons showed.
- Website type-check, lint and `npm run build` pass.

Not checked: a real change arriving (needs a change in the Supabase Table Editor, which the team makes; nothing was written to the hosted database), a phone, and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** adding, changing and removing a destination and an accommodation in the Table Editor, and writing or deleting a review in another browser, updated an open home page within a few seconds, keeping the scroll position and search text. "Works on the live URL" stays open until ticket 90 is pushed and checked there.

**Checked by the team on the live URL (2026-11-02):** after the push (99ff1f5), on a laptop and a phone, changes showed on open pages without a reload.
