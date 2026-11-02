# 87 — Delete a reply with its answers

**What to build:** A traveler can still delete their own reply. When it has answers under it, the confirm step says "Delete this reply and its answers?", and the reply and the whole thread under it (all levels, whoever wrote them) disappear from the page at once and from the database. A reply with no answers keeps the usual "Delete this reply?" step.

**Blocked by:** 85

**Status:** done (confirmed by the team on the live URL, 2026-11-02)

- [x] A reply with answers asks "Delete this reply and its answers?"; one without answers asks "Delete this reply?"
- [x] After deleting, the whole thread under it is gone at once, and still gone after a refresh
- [x] Deleting someone else's reply is still refused by the database (Row Level Security), not just hidden in the page
- [x] The answer and messages from DELETE /v1/replies/:id are the same as before
- [x] Works on the live URL

**Progress (2026-11-02):** the replies component's confirm step says "Delete this reply and its answers?" when the reply has answers, and "Delete this reply?" when it has none. After the backend confirms, the page removes the reply and every answer under it, all levels deep (the same ones the database deletes, 028), so nothing waits for a refresh. A Reply form open under a deleted answer closes. Website only: no data, backend or message changes.

Checked:
- Browser, with a pretend login and pretend backend answers (nothing sent to Supabase), on a pretend thread six levels deep: your own reply with no answers asked "Delete this reply?" (cancelled); your own level-2 reply with five answers under it (two branches, other travelers' answers included) asked "Delete this reply and its answers?". "Yes, delete" sent one delete for that reply, showed "Your reply has been deleted.", and removed it and all five answers at once; the level-1 reply and another top-level reply stayed.
- curl against the local backend, DELETE /v1/replies/:id: no login 401 "Please log in, then try again."; fake login 401 "Please log in again, then try again."; a bad id 400. Same answers as before.
- The database side was proved in ticket 85, as two travelers inside a rolled-back transaction: a stranger deleting a reply deleted 0 rows; the writer deleting it deleted 1, and the answers under it went too.
- Website type-check, lint and `npm run build` pass.

Not checked: a real login (the team tests real logins), "still gone after a refresh" with real data, and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** with a real login, deleting a reply with answers asks "Delete this reply and its answers?" and the whole thread is gone at once and after a refresh; a reply without answers asks "Delete this reply?". "Works on the live URL" stays open until ticket 87 is pushed and checked there.

**Checked by the team on the live URL (2026-11-02):** the threaded replies round checklist passed after the push (1c3170c).
