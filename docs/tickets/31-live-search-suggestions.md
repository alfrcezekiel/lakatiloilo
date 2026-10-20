# 31 — Live suggestions while typing

**What to build:** As a traveler types in **Where to?**, a dropdown appears under the box with up to 6 matching destinations and accommodations, matched on name and address. Each suggestion shows the place name, its category and its area (Iloilo City or Province). Suggestions respect the category and location already chosen. Choosing a suggestion opens its detail page.

**Blocked by:** 30

**Status:** done

- [x] ~~Typing "din" shows Dinagyang Festival; choosing it opens its detail page~~ *(superseded in ticket 32: choosing it fills the box; Explore opens the page)*
- [x] At most 6 suggestions, each with name, category and area
- [x] Suggestions only include places in the chosen category and location
- [x] ~~Arrow keys move through suggestions, Enter opens the highlighted one, Escape closes the dropdown~~ *(superseded in ticket 32: Enter now picks the highlighted one; arrows and Escape unchanged)*
- [x] Clicking outside closes the dropdown
- [x] When nothing matches, the dropdown says "No matches"
- [x] Works on the live URL

**Changed during ticket 32 (team feedback):** picking a suggestion now fills the search box instead of opening the page straight away; Explore (or Enter) then opens its detail page.
