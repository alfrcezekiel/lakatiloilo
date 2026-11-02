# 80 — Report a review

**What to build:** A logged-in traveler sees a small "Report" link on other travelers' reviews. It opens a pop-up with four reasons (Spam, Offensive, Not about this place, Other) and an optional note (up to 300 characters). Sending it says "Thanks — the team will take a look."; reporting the same review again says "You've already reported this review." Nothing is hidden automatically: the team reads reports in the Supabase dashboard. Reports are kept in a new review_reports table with Row Level Security, described to TypeORM as a ReviewReport entity, and written through the backend as the logged-in traveler.

**Blocked by:** None

**Status:** done (confirmed by the team on the live URL, 2026-11-02)

- [x] A numbered SQL file creates review_reports with Row Level Security on and policies: no one may read reports through the app; a logged-in traveler may add a report only as themselves and never on their own review; one report per traveler per review; no one may edit or delete one through the app. The team has run it in the Supabase SQL Editor
- [x] POST /v1/reviews/:id/report works through TypeORM as the logged-in traveler and answers the thank-you message; refusals give plain messages (not logged in, no such review, your own review, unknown reason, already reported)
- [x] The Report link shows only to logged-in travelers, and never on their own review
- [x] The pop-up can be closed with Escape or Cancel, and works with the keyboard
- [x] A sent report appears in the Supabase dashboard (Table Editor → review_reports)
- [x] Reading reports through the backend or the website is refused by the database
- [x] Works on the live URL

**Progress (2026-11-02):** supabase/sql/026-review-reports.sql creates review_reports (reason one of spam / offensive / not_about_place / other, optional note up to 300 characters, one report per traveler per review, removed with its review) with Row Level Security on and exactly one policy: a logged-in traveler may add a report only as themselves and never on their own review. Nobody may read, edit or delete reports through the app, including the backend's own login; the team reads them in the Supabase dashboard. The team ran it in the Supabase SQL Editor ("it worked").

Backend: a ReviewReport entity (id, user_id and date never sent) and a reports service and controller: POST /v1/reviews/:id/report as the logged-in traveler (through the shared TravelerTransactions helper), answering 201 "Thanks — the team will take a look." It never asks for the saved row back, since travelers may not read reports. Refusals: 401 not logged in, 404 no such review, 400 "Please choose a reason." / "Please keep the note to 300 characters." / "You can't report your own review.", 409 "You've already reported this review."

Website: logged in, other travelers' reviews show a small "Report" link (flag icon) on the right of the Helpful row; never on your own review, and not when logged out. It opens a pop-up (the browser's own dialog: dimmed page behind, keyboard kept inside, Escape closes) titled "Report this review", with the four reasons as large choices, an optional note with a 0 / 300 counter, Send report (amber, "Sending…") and Cancel. After sending it shows the thank-you message (or "You've already reported this review.") with Close, and the link becomes "Reported".

Checked:
- Against the real database, inside a rolled-back transaction (nothing kept): the SQL sent names only review_id, reason and note, with no RETURNING; reporting someone else's review worked; reporting it again was refused (23505); an unknown reason and a 301-character note were refused (23514); the reporter reading, editing or deleting reports was refused (42501); reporting "as" someone else by sending user_id directly was refused (42501); the owner reporting their own review was refused by the policy (42501); the backend's own login reading reports was refused (42501).
- curl against the local backend: no login 401, fake login 401, no reason and unknown reason 400 "Please choose a reason.", 301-character note 400, bad review id 400.
- Browser with a pretend login and pretend backend answers (one preview tab; nothing sent to Supabase): no Report link when logged out or on my own review; Send without a reason showed "Please choose a reason."; sending showed "Sending…" (disabled), posted the reason and note, and showed the thank-you; the link became "Reported"; a 409 answer showed "You've already reported this review." and Close closed it; the real Escape key closed the pop-up; keyboard focus moved inside it when opened; the page behind is dimmed (60% black).
- Backend type-check, website type-check, lint and `npm run build` pass.

Not checked: a real login, seeing a real report in the Supabase dashboard (Table Editor → review_reports), and the live URL (not pushed yet).

**Checked by the team on localhost (2026-11-02):** with a real login, reporting a review works, reporting it again says it was already reported, and the report shows in the Supabase dashboard (Table Editor → review_reports). "Works on the live URL" stays open until ticket 80 is pushed and checked there.

**Confirmed by the team (2026-11-02):** checked on the live URL and marked done.
