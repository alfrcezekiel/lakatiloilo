# 74 — My profile from the navbar

**What to build:** When a traveler is logged in, "Hi, <name>" in the navbar opens their own profile page. A traveler with no reviews yet still gets a profile: their name and traveler type (from "who is logged in") and "You haven't written any reviews yet."

**Blocked by:** 73

**Status:** todo

- [x] On tablets and laptops, a profile icon beside Explore opens a dropdown headed by the traveler's name (in serif), then My profile and Log out; it closes after choosing, with Escape, or by clicking elsewhere
- [x] On a phone, the menu lists the traveler's name (in serif), My profile and Log out
- [x] My profile opens the traveler's own profile
- [x] A traveler with reviews sees the same profile everyone else sees
- [x] A traveler with no reviews sees their name, traveler type and "You haven't written any reviews yet.", not "We couldn't find this traveler"
- [x] Log out from the dropdown (and from the phone menu) still works
- [ ] Works on the live URL

**Progress (2026-11-01):** "Hi, <name>" in the navbar is now a link to the traveler's own profile (/travelers/<their id>), in the bar on wider screens and in the phone menu (which closes when it is tapped). It underlines on hover, has a keyboard outline, says "My profile" on hover, and screen readers hear "Hi, <name> (my profile)". Log out is unchanged.

A traveler with reviews sees the same profile everyone sees. When the backend has no public profile for an id, the page now checks whether it is the logged-in traveler's own id: if so it shows their profile with their name and traveler type (from "who is logged in") and "You haven't written any reviews yet."; anyone else still sees "We couldn't find this traveler". Nothing shows for the moment while the login is checked, so the wrong message never flashes.

Checked on localhost, logged out: an unknown traveler still shows "We couldn't find this traveler"; Red's profile still opens; the navbar shows "Log in". Type-check, lint and `npm run build` pass. Not checked: the logged-in parts (the "Hi, <name>" link and the empty own profile). A pretend login could not be kept in the preview (see tickets 69 and 72), and the team tests real logins. Also not checked: a real phone, and the live URL (not pushed yet).

**Change (2026-11-01, team request):** instead of "Hi, <name>" and "Log out" as text in the bar, a logged-in traveler gets a round profile icon beside Explore. Clicking it opens a dropdown with "Logged in as <name>", My profile and Log out. The phone menu, which has no room for a dropdown, lists the same three directly. The spec's screen 20 and its checklist line were updated to match.

**Progress (2026-11-01, after the change):** A new ProfileMenu shows a round glass profile icon beside Explore (after the divider) on tablets and laptops. Clicking it turns the icon amber and opens a small glass dropdown under it: "LOGGED IN AS <name>", My profile (person icon) and Log out (log-out icon). It closes after choosing, with Escape (which puts the keyboard back on the icon), or by clicking anywhere else; screen readers hear "Account menu for <name>" and whether it is open. The phone menu lists "Logged in as <name>", My profile and Log out directly. Logged out, "Log in" is unchanged.

Checked on localhost with a pretend login and pretend answers for "who is logged in" only (no real account, nothing sent to Supabase):
- Phone width: the menu showed "Logged in as Pretend Traveler", My profile and Log out; tapping My profile closed the menu and opened /travelers/<id>, which, since this pretend traveler has no reviews, showed "Pretend Traveler", "Local Ilonggo", "0 reviews" and "You haven't written any reviews yet." (the own empty profile from before the change).
- 1280 px: the icon sat just right of Explore; clicking it opened the dropdown (inside the screen, on top of the page) with the three items; Escape closed it and put the keyboard back on the icon; clicking elsewhere closed it.
- Lint and `npm run build` pass.

Found while checking (testing setup, not the site): earlier pretend logins kept disappearing because eight old preview tabs of the site were still open. Saving a pretend login in one tab made the others ask the real backend "who is logged in", get 401 and forget the login for every tab. With the old tabs closed, the pretend login stayed.

Not checked: clicking Log out in the dropdown (the preview closed first; it runs the same log-out code as before), a real login, a real phone, and the live URL (not pushed yet).

**Change (2026-11-01, team request):** the dropdown and the phone menu no longer say "Logged in as". The dropdown is headed by the traveler's name alone, in the site's serif heading font (Fraunces, larger); the phone menu shows the name the same way, a size up. My profile and Log out are slightly larger with a little more letter spacing. The spec's screen 20 was updated to match.

**Progress (2026-11-01, after the second change):** Checked on localhost at 1280 px with a pretend login and pretend answers for "who is logged in" and log-out only (no real account, nothing sent to Supabase): the dropdown reads "Pretend Traveler", then My profile and Log out, with no "Logged in as"; the name is Fraunces at 20 px (weight 500), the items 15 px with slight letter spacing. Clicking Log out in the dropdown sent the log-out request to the backend, forgot the login, removed the profile icon and showed "Log in". Lint and `npm run build` pass. Not checked: the phone menu's new name style on screen (same classes, a size up), a real login, a real phone, and the live URL (not pushed yet).

**Ticked by the team (2026-11-01):** the team ticked the boxes after testing on localhost with a real login. "Works on the live URL" stays open until ticket 74 is pushed and checked there.
