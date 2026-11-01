# 63 — "Who is logged in" through TanStack Query

**What to build:** The website asks the backend "who is logged in" through TanStack Query, so every part of the page shares one remembered answer per login. After the first check, moving between pages shows the navbar's "Hi, <name>" and the Reviews section's form or Edit/Delete buttons straight away, without a brief wait. Login renewal keeps its own code and is not changed.

**Blocked by:** None

**Status:** in progress

- [ ] After logging in, moving between the home page and a detail page shows "Hi, <name>" and the review form or Edit/Delete buttons at once, with no brief "checking" moment
- [ ] Logging in or out in one tab updates another open tab
- [ ] Logging out shows "Log in" straight away, and the review buttons disappear
- [ ] If the backend cannot be reached, the navbar still shows the name from inside the login
- [ ] A login the backend refuses is forgotten, and the page shows "Log in"
- [ ] Staying logged in for over an hour still works (renewal unchanged)
- [ ] Works on the live URL

**Progress (2026-11-01):** "Who is logged in" now goes through TanStack Query, with one remembered answer per login shared by every component. The website still reads its own copy of the login and hears when it changes, in this tab or another. A login that has run out shows the name inside it while renewal runs (so it never logs the traveler out by mistake); a login the backend refuses is forgotten; if the backend cannot be reached, the name inside the login is used. When the login is renewed, the same traveler's name stays on screen while the new login is checked. Renewal itself (the timer, the one-tab-at-a-time lock, the retries), log out and the old Supabase cookie clean-up are unchanged.

Checked on localhost with a pretend login (not a real account) and pretend answers from the "who is logged in" endpoint only; everything else talked to the real local backend. The navbar went from "Log in" to "Hi, Pretend Traveler" after one request. Opening a hotel and going back home asked no more: the review form showed as soon as reviews loaded ("Log in to write a review" never appeared), and the navbar had the name on its very first check after going back. Logging out and in from another tab (the browser's storage event) switched this tab to "Log in" and back. A pretend 401 forgot the login and showed "Log in". A pretend network error showed the name from inside the login. The Log out button showed "Log in" at once and forgot the login. A pretend renewal kept the name on screen throughout. Type-check, lint and `npm run build` pass. Not checked: a real login and staying logged in for over an hour (the team tests real logins), and the live URL.

**Fixed (2026-11-01, found by the team):** after logging in, the login page showed its "Checking whether you are logged in" screen until the home page appeared, instead of keeping the form on screen while sending the traveler on. Root cause: the form marked itself as "leaving" only after saving the login. With this ticket the page hears about a new login instantly, so in that gap it saw a new login being checked and swapped the form for the screens meant for visitors who open /login while already logged in. The form now marks itself as leaving before saving the login, and "leaving" wins over both of those screens. Checked on localhost with pretend answers for the log-in and "who is logged in" endpoints only (dummy email and password, nothing sent to Supabase): from pressing Log in until the home page appeared, only the form was ever on screen, then the menu showed "Hi, Pretend Traveler". Opening /login while already logged in still shows "You're logged in as Pretend Traveler." Type-check, lint and `npm run build` pass.
