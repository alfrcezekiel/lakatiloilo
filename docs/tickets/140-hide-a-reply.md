# 140 — Hide a reply

**What to build:** On the Reviews screen's replies, each reply gets **Hide it / Show it** beside Delete, with the same 8-second Undo. A hidden reply shows to travelers as "This reply was hidden by the Lakat Iloilo team.", and the answers under it stay. Its writer still sees their own text, marked "Hidden by the Lakat Iloilo team". Show it brings it back.

**Blocked by:** None

**Status:** in progress

- [x] The replies table has hidden_at; only admins may set or clear it (proved with a rolled-back test)
- [x] Hide it / Show it on each reply, with Undo for 8 seconds
- [x] Travelers and logged-out visitors see the hidden sentence instead of the text (checked with curl); the answers under it stay
- [x] The writer sees their own text marked "Hidden by the Lakat Iloilo team"
- [x] A logged-out visitor gets 401 and a traveler 403 on the new endpoints
- [x] Works with the keyboard alone, at 320, 375 and 425 px
- [ ] Works on the live URL

## Progress (2026-11-13)

- Database: supabase/sql/056-admins-hide-replies.sql, run by the team ("it worked"). review_replies gets hidden_at; while hidden, the text moves to a new reply_hidden_texts table that only admins and the backend's login may read (so it cannot be read with the site's public key); admin_hide_reply / admin_show_reply (admins only) move it out and back; a hidden reply cannot be edited or marked Helpful, can still be answered, never shows "edited", and a deleted one keeps no hidden text.
- Backend: POST /v1/admin/replies/:id/hide and /show (200 { id, hidden, message }, 404 for a reply that is gone or deleted). The dashboard's replies carry `hidden` and the text; the public replies carry `hidden` and an empty text, except to the reply's own writer, who gets their text back. curl: both routes 401 logged out and with a fake login.
- Dashboard: Hide it / Show it between Helpful and Delete (phones: three equal columns, icon above the label). Hide it waits 8 seconds with Undo ("…'s reply hidden. Hiding in 8 s. Undo"), like Delete; Show it acts at once. A hidden reply shows a "Hidden" label, its text greyed, and what travelers see.
- Place pages: everyone but the writer sees "This reply was hidden by the Lakat Iloilo team." in its place, with its answers kept (like a deleted reply); the writer sees their text with "Hidden by the Lakat Iloilo team…", and Edit is gone (Delete stays).
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` and the rule searches pass.
- Proof of the rules (rolled back, nothing kept): a traveler hiding a reply → refused ("Only the Lakat Iloilo team may hide replies.", 42501); the admin hides it → the reply's stored text is empty, hidden_at set, not marked "edited", hiding again changes nothing; the backend's login reads the waiting text; another traveler reads 0 rows of it and an empty reply; another traveler marking it Helpful → refused; its writer editing it → 0 rows; a writer who is not an admin reads 0 rows of their own waiting text directly (the backend gives it to them); an admin reads it; Show it → the exact text back, not "edited", nothing left waiting; the writer deleting a hidden reply → its waiting text is gone.
- **Not yet checked (team, needs an admin login):** Hide it with Undo and Show it in the browser, what travelers and the writer see on the place page, 320–425 px, keyboard, 403 for a traveler.
- Team check (2026-11-13, localhost): Hide it waited 8 seconds with Undo, then the dashboard showed the reply with what travelers see; on the destination page another logged-in traveler saw "This reply was hidden by the Lakat Iloilo team."; everything else worked. "marked all the boxes as ticked". Only the live URL is left (ticket 150).
