# 103 — Opening and reading notifications

**What to build:** Clicking a notification opens that place's page and marks it read. "Mark all as read" sits at the top of the list. The red dot and its number go down as notifications are read, and disappear when none are unread.

**Blocked by:** 102

**Status:** todo

- [x] Clicking a notification opens the right place's page, and it shows as read afterwards
- [x] Mark all as read clears the red dot
- [x] A traveler cannot mark someone else's notification read (checked through the backend)
- [ ] Works on the live URL

**Change (2026-11-07, team request):** clicking a notification opens the place page scrolled to that review, not just the top of the page. docs/SPEC.md updated to match.

**Progress (2026-11-07):** built, no database change (035 already lets a traveler change only read_at on their own notifications). Backend: GET /v1/notifications also answers review_id; POST /v1/notifications/read marks one ({ id }) or all ({}) read, as the logged-in traveler, and answers unread_count. Website: each notification is a link to the place page at "#review-<id>"; clicking it marks it read at once (the red number goes down, and disappears at 0) and closes the dropdown or phone menu; "Mark all as read" shows at the top while something is unread. Each review on a place page has an anchor, and the page scrolls to it once the reviews have loaded.

Checked: backend and website type-check and lint, website `npm run build`; POST /v1/notifications/read answers 401 without a login and with a fake one, and 400 "We couldn't find that notification." for an id that is not an id. Proved earlier (ticket 102, rolled back) that marking someone else's notifications read changes 0 rows. Not checked: clicking in a browser, and the live URL.

**Change (2026-11-07, team request): open the exact reply, and tell kinds apart.** A notification about a reply, an answer or a Helpful mark on a reply opens the place page with "?focus=reply-<id>": the threads around that reply open (even past "Show N more replies"), the page scrolls to it and it glows amber for 3 seconds; a Helpful mark on a review does the same for the review ("?focus=review-<id>"). Hiding a thread that was opened this way keeps the others open and drops "?focus" from the address. In the list, each kind has its own icon (speech bubble, answer arrow, amber thumbs-up). Backend: GET /v1/notifications also answers reply_id. docs/SPEC.md updated.

Checked: type-check, lint and `npm run build` (website and backend); in the browser on localhost, Jaro Cathedral opened with ?focus= on a reply two levels deep: its two parent threads and its own were open, the other threads stayed folded, the reply was on screen (241 px from the top) and highlighted. (A first version kept the target in a stored value; React's development double-mount cleared it, so it moved into the address.) Not checked: clicking from the bell with a second account, the icons by eye on a phone, and the live URL.

**Fix (2026-11-07, team report "clicking a notification stays at the top"):** two causes. (1) After moving to a page, Next.js scrolls it to the top by itself, which could run after the page had scrolled to the item; the notification links now use scroll={false}, so only the page scrolls. (2) Clicking a notification whose address was already open (clicked again, or after scrolling away) changed nothing in the address, so the page never heard about it; the click now also tells the page directly ("lakat-focus"), which scrolls to the item one frame later. Checked in the browser on localhost (moving to the page the way a click does, without clicking the team's real notifications, so none were marked read): from the home page the nested reply landed 241 px from the top; scrolled back to the top and "clicked" again with the same address, it landed at 241 px again. Type-check, lint and `npm run build` pass. Not checked: the team clicking from the bell, a phone, and the live URL.

**Team check (2026-11-07, localhost):** the team confirmed every box above in the browser. Not checked yet: the live URL (the team will commit and push when the round is finished).

**Change (2026-11-07, team request): a lasting, distinct mark on the notified item.** The 3-second glow often faded before the page finished scrolling, so the reply looked like every other one. Now the reply a notification opened keeps an amber line (drawn exactly over the thread's white line), a soft amber background and a "From your notification" label with a bell; only the reply's own content is marked, not the answers under it. A review opened by a Helpful notification gets an amber border, the same background and label. The short glow on arrival stays. Shared in src/components/FromNotification.tsx. docs/SPEC.md updated.

Checked: type-check, lint and `npm run build`; in the browser on localhost (Jaro Cathedral, ?focus= on a nested reply): the label "From your notification" shows, the amber line sits at the same x (462 px) as the white thread line, and the answer under it is not tinted. Not checked: a review opened by a Helpful notification by eye, a phone, and the live URL.

**Change (2026-11-07, team request): lightly rounded corners.** The notified reply's amber frame is now rounded 8 px on all four corners (it was rounded only on the right), with a faint amber outline and the stronger amber line on the left, still drawn over the thread's white line. Checked in the browser on localhost: all four corners 8 px, left line 2 px, outline 1 px, amber line at the same x (462 px) as the white thread line. `npm run build` passes.
