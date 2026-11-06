# 95 — Edit your own reply

**What to build:** A logged-in traveler's own replies get **Edit** next to Delete. The same small form (up to 300 characters) opens in place of the reply's text, filled in, with Save and Cancel. An edited reply shows "· edited" after its date. Other travelers' replies have no Edit.

review_replies gains updated_at (empty until the first edit). A new Row Level Security policy lets only the reply's writer change it, and only its text.

**Blocked by:** None

**Status:** todo

- [x] A numbered SQL file adds updated_at and the edit policy; only the comment (1–300 characters) can change. The team has run it in the Supabase SQL Editor
- [x] PATCH /v1/replies/:id edits the traveler's own reply and answers with it; 404 "We couldn't find that reply among yours." for someone else's reply, 400 outside the limits, 401 without a login
- [x] GET /v1/reviews gives each reply its updated_at
- [x] Editing a reply updates it at once and shows "· edited", also after a refresh
- [x] Editing someone else's reply is refused by the database, not just hidden in the page
- [x] Looks tidy on a phone (375 px) and a laptop
- [ ] Works on the live URL

**Progress (2026-11-05):** supabase/sql/031-edit-your-own-reply.sql adds updated_at to review_replies, a trigger that sets it only when the comment changes (so 030's name copy never marks a reply "· edited"), permission to change only the comment, and the policy "repliers can edit their own replies". Row Level Security stays on; the four policies from 025 are unchanged. The team ran it in the Supabase SQL Editor ("it worked").

Backend: the ReviewReply entity has updated_at, and comment is no longer update: false. PATCH /v1/replies/:id changes the text as the logged-in traveler (TravelerTransactions) and answers with the saved reply; 0 rows changed answers 404 "We couldn't find that reply among yours. Please log in again and try." GET /v1/reviews gives every reply updated_at.

Website: the traveler's own replies get Edit next to Delete. It opens the same small form in place of the text, filled in, with Save changes and Cancel; after saving, "Your reply is updated." shows under it. A reply with updated_at shows "· edited" after its date.

Checked:
- Database, through the backend's own login inside a transaction that was rolled back (nothing kept): a stranger editing a reply changed 0 rows; the writer changing replier_name or review_id was refused (42501); the writer editing the text changed 1 row and set updated_at; saving the same text kept updated_at; after the rollback the reply was unchanged.
- curl against the local backend: no login 401; fake login 401; a bad id 404 "We couldn't find that reply."; empty text and 301 characters 400 "Please write 1 to 300 characters."; GET /v1/reviews replies carry updated_at.
- Website and backend type-checks, lint and `npm run build` pass.

Not checked: editing a real reply in the browser (the team tests real logins), the look at 375 px and on a laptop, and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-05):** with a real login, editing their own reply worked and showed "· edited" (on the right, after the date); Edit then Cancel kept the original text; saving an empty reply showed the message; logged out, no reply has Edit; the layout stays responsive. Still to confirm: "· edited" after a refresh, no Edit on someone else's reply while logged in, and the live URL.

**Checked by the team on localhost (2026-11-05):** after a hard refresh, the edited reply still shows the new text and "· edited"; logged in, someone else's reply shows only Reply, with no Edit or Delete. Only "Works on the live URL" is left.
