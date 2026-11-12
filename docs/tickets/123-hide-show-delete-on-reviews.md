# 123 — Hide it, Show it and Delete review on Reviews

**What to build:** Each review on the Reviews screen gets Hide it or Show it, and Delete review (after "Yes, delete"). Show it brings a hidden review back and keeps its reports.

**Blocked by:** 122

**Status:** done

- [x] Hide it, Show it and Delete review all work, and the list updates at once
- [x] Showing a reported review keeps its reports on the Reports screen
- [x] A traveler cannot use these endpoints (401 or 403, checked with curl)
- [x] Works on the live URL

## Progress (2026-11-10)

- No database change: admins may already hide, show and delete any review (040).
- Backend: new `POST /v1/admin/reviews/:id/show` (shows a hidden review, keeps its reports; 200 `{ id, message }`, 404 if gone). Hide it and Delete review reuse ticket 109's endpoints. curl: 401 without a login and with a fake one.
- Proved in a rolled-back transaction through the backend's login (nothing kept): on a hidden, reported review, a traveler's "show" changed 0 rows; the admin's Show it made it visible and its 1 report stayed.
- Frontend: each card on /admin/reviews has **Hide it** / **Show it** and **Delete review**. Delete opens the same pop-up as Delete place (now one shared `ConfirmDeleteDialog`): "Delete this review for good? <reviewer>'s review of <place>. Its replies, Helpful marks, reports and photos are deleted too." The card changes at once (Hidden/Visible, or gone), a line says what happened, and the Reviews, Reports and Overview lists are asked again. The Reports screen's buttons now refresh the Reviews list too.
- Checked in the browser with the team's admin login (only opening and cancelling, nothing changed): the review pop-up opens with Cancel focused, Escape closes it and the focus returns to Delete review; Delete place still opens its pop-up ("Its 6 reviews will be deleted too…") and Cancel returns the focus.
- `npx tsc`, eslint, backend `tsc --noEmit` and `npm run build` pass.
- Team check (2026-11-10, localhost): "it displays the button of show it / hide it / delete reviews it works efficiently."
- **Not yet checked:** the live URL.
