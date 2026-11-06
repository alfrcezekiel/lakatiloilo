# 94 — Change your name and traveler type

**What to build:** On their own profile, a logged-in traveler sees an **Edit profile** button. It opens a small form with the display name (2–40 characters) and "I'm traveling as" (Local Ilonggo, Visitor from PH, Foreign tourist), with Save and Cancel. After saving, "Your profile is updated." shows, and the new name and tag appear on the profile, in the navbar dropdown, and on every review and reply the traveler has written. Nobody else sees the button.

The name and type stay on the Supabase Auth account. The backend changes them with the traveler's own login (never the service_role key). A database trigger on the account copies them onto every reviews and review_replies row with that user_id, without changing their "last edited" time.

**Blocked by:** None

**Status:** todo

- [x] A numbered SQL file adds the trigger that copies a changed name and type onto the traveler's reviews and replies; Row Level Security is unchanged on both tables. The team has run it in the Supabase SQL Editor
- [x] PATCH /v1/auth/me changes the traveler's own name and type and answers like GET /v1/auth/me; 400 outside the limits, 401 without a login
- [x] Edit profile shows only on the traveler's own profile; Cancel leaves everything as it was
- [x] After saving, the profile, the dropdown and all old reviews and replies show the new name and tag, also after a refresh
- [x] Looks tidy on a phone (375 px) and a laptop
- [ ] Works on the live URL

**Progress (2026-11-05):** supabase/sql/030-copy-profile-changes.sql adds a trigger on the account (auth.users) that copies a changed display name or traveler type onto all of that traveler's reviews and replies, using the same rules as 022 and 025. The reviews trigger now only changes updated_at when the stars, text or photo change, so a name change keeps each review's real "last edited" time. Row Level Security is unchanged. The team ran it in the Supabase SQL Editor ("succesfully ran").

Backend: PATCH /v1/auth/me checks the name (2–40 characters) and type, then changes the traveler's own account through Supabase Auth's "update my account" address with their own login token and the publishable key (supabase-js's updateUser needs a stored login, which the backend never keeps). It answers like GET /v1/auth/me.

Website: on the traveler's own profile, an Edit profile button opens a form (display name and "I'm traveling as", Save and Cancel). After saving, "Your profile is updated." shows, the header and the navbar dropdown show the new name at once, and the profile and any open reviews are asked for again.

Checked:
- Database, read-only through the backend's own login: the copy_profile_to_reviews_and_replies trigger is on auth.users and enabled; reviews_before_write keeps the old updated_at when only the name changes.
- curl against the local backend: no login 401 and fake login 401 "Please log in, then try again."; a 1-character name 400 "Your display name needs 2 to 40 characters."; an unknown type 400 "Please pick how you're traveling."; the browser may send PATCH (CORS).
- Website type-check, lint and `npm run build` pass; backend type-check passes.

Not checked: a real name change (the team tests real logins), old reviews and replies showing the new name, the form in the browser at 375 px and on a laptop, and the live URL (not pushed yet).
**Checked by the team on localhost (2026-11-05):** with a real login, changing the display name and "I'm traveling as" worked, and the change showed straight away (live) on the page. Still to confirm: no Edit profile on someone else's profile, Cancel leaves everything as it was, the look at 375 px, and the live URL.

**Checked by the team on localhost (2026-11-05):** Edit profile shows only on the logged-in traveler's own profile, never on someone else's; on a phone it looks tidy and responsive. Still to confirm: Cancel leaves everything as it was, and the live URL.

**Checked by the team on localhost (2026-11-05):** Edit profile, then Cancel, still shows the old name. Only "Works on the live URL" is left.
