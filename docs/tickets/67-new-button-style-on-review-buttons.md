# 67 — New button style on the review buttons

**What to build:** The Reviews section on both detail pages uses the new button style from ticket 66: Post review (main), Cancel (second), Edit (second), Delete (danger, red outline), "Yes, delete" (solid red) and "Log in to write a review" (main). While a review is being saved or deleted, the button shows a spinner and a word like "Posting…".

**Blocked by:** 66

**Status:** done (confirmed by the team on the live URL, 2026-11-01)

- [x] Post review, Cancel, Edit, Delete, "Yes, delete" and "Log in to write a review" use the new style, on both detail pages
- [x] Delete is a red outline; only the "Yes, delete" step is solid red
- [x] While saving or deleting, the button shows a spinner and a word like "Posting…", and cannot be pressed twice
- [x] Writing, editing and deleting a review still work
- [x] Moving through the Reviews section with the Tab key shows a clear outline on every button
- [x] With "reduce motion" turned on, buttons do not move
- [x] Works on the live URL

**Progress (2026-11-01):** The Reviews section uses the pill buttons from ticket 66. Post review and Save changes are amber main buttons (send and tick icons), Cancel and Edit are glass (cross and pencil icons), Delete is a red outline (bin icon), and the "are you sure?" step now says "Yes, delete" in solid red (it used to repeat "Delete"). "Log in to write a review" changed from an underlined text link into an amber main button with a log-in icon. While saving or deleting, the button shows a spinner and "Posting…", "Saving…" or "Deleting…", and is disabled so it cannot be pressed twice.

Checked on localhost on a destination page (Agony Hill, teal). Logged out: "Log in to write a review" is amber, 44 px, reads clearly on teal, and still links back to this page after login. Logged in with a pretend login and pretend backend answers for "who is logged in" and the reviews endpoints only (no real account, nothing sent to Supabase): Post review showed a spinner, "Posting…" and was disabled; the posted review showed Edit (glass) and Delete (red outline); Delete opened "Yes, delete" (solid red) and Cancel (glass); "Yes, delete" showed a spinner, "Deleting…", then "Your review has been deleted."; Edit showed Save changes (amber) and Cancel (glass). Every button measured 44 px tall with an icon, and the page did not scroll sideways. Lint and `npm run build` pass. Not checked: a real login, the accommodation (blue) page with these buttons, a real phone, and the live URL (not pushed yet).

**Ticked by the team (2026-11-01):** the team ticked the boxes after testing on localhost. "Works on the live URL" stays open until ticket 67 is pushed and checked there.

**Confirmed by the team (2026-11-01):** checked on the live URL and marked done.
