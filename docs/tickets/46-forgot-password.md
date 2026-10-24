# 46 — Forgot password and set new password pages

**What to build:** A "Forgot password?" link in Log in mode opens a page where the traveler types their email and gets a reset link from Supabase. The link opens a Set new password page, where they choose a new password (with the strength bar from ticket 43), see a pop-up saying whether it worked, then log in with it on the log-in page.

**Blocked by:** 43

**Status:** in progress (changed on localhost 2026-10-24 so a reset never logs anyone in; not pushed yet)

**Checked on localhost (2026-10-24):** the "Forgot password?" link, the empty-email message, and the Set new password page's three error views (opened without a link, an expired link, a code that does not work) all show the right message. Sending a real email was left for the team.

- [x] The team adds the reset page's address, on localhost and on the live URL, to the allowed redirect URLs in the Supabase dashboard (Authentication → URL Configuration)
- [x] The Forgot password page always answers "If that email has an account, we've sent a link", so it never reveals who has an account
- [x] Too many requests (Supabase's built-in sender allows only a few emails an hour) shows a plain message, not a crash
- [x] The link in the email opens the Set new password page; saving a new password shows a "Password changed" pop-up, and its "Go to log in" button opens the log-in page, logged out
- [ ] When the password cannot be changed (for example, the same as the old one), a "Password not changed" pop-up gives the reason and lets the traveler try again
- [x] An expired or already-used link shows a clear message and a link to ask for a new one
- [x] The new password works for logging in; the old one no longer does
- [x] Opening a reset link and then leaving without saving a new password (or opening the same link a second time) does not leave the traveler logged in
- [ ] Opening the link does not show the traveler as logged in in any other open tab
- [ ] Works on the live URL

**Bug fix (2026-10-24):** the team opened a reset link, then opened it a second time (it said "expired"), went back to log in, and found themselves logged in without typing a password. Cause: opening a reset link logs the traveler in so the Set new password page can change the password, and nothing removed that login if they did not save. Fix: while a reset is in progress the site remembers it, and any other page (or the reset page itself, when the link fails) logs that login out. It only becomes a real login once the new password is saved. This also fixes the code review's S1.

**Fix (2026-10-24):** after several reset emails in a row the team saw "Something went wrong". Supabase answers too many requests with status 429, and answers with a server error (500) when its built-in sender has used up its few emails for the hour; neither was explained. The page now says "Please wait N seconds…" for the once-a-minute limit, and "We couldn't send the email right now… try again in an hour" for the hourly one.

**Bug fix (2026-10-24):** sending several reset links in a row showed "Something went wrong" instead of the rate-limit message. Cause: Supabase does not always label its "too many requests" answer with a code, and the form only checked the code. Fix: the form now also checks the answer's status (429, "too many requests"). It says "wait a minute" for Supabase's one-link-a-minute limit and "about an hour" for the hourly email limit. Sign-up got the same fix.

**Bug fix (2026-10-24):** the team found that resetting a password logged them in without using the log-in page. Causes: (1) saving a new password logged the traveler in on purpose, and (2) opening the reset link logs the browser in so the Set new password page can change the password, and Supabase shares that login with every open tab, so other Lakat tabs showed the traveler as logged in. Fix: after saving, the site logs that login out and sends the traveler to the log-in page with "Your password is changed. Log in with your new password." Every page now treats a login made by a reset link as "not logged in".

**Change (2026-10-24, team request):** the result of "Save new password" now shows in a pop-up instead of a message under the log-in form. Success: "Password changed" with "Go to log in". Failure: "Password not changed" with the reason, and "Try again" (or "Send me a new link" when the link has expired). A password that is too short is still caught under the field, before anything is sent. Checked on localhost with a pretend reset login and pretend Supabase answers: both pop-ups show, the button gets keyboard focus, "Try again" closes the pop-up, and "Go to log in" opens an empty log-in page, logged out.

