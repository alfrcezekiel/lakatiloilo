# 29 — Category chips under the search bar

**What to build:** Under the search bar, a traveler sees chips: All, Mountains, Food, Festivals, Hotels, Condominiums, Walking Areas, Nature & Parks, Heritage Sites. Clicking a chip shows only that category's places in the list sections further down the page; clicking All brings every section back. The chosen chip is highlighted (white), the rest are glass outlines.

**Blocked by:** None

**Status:** done

- [x] All nine chips appear, styled as in the mockup, with All selected at first
- [x] ~~Clicking a destination chip (e.g. Mountains) shows only that category's section below~~ *(superseded in ticket 32: chips no longer filter the lists)*
- [x] ~~Clicking Hotels or Condominiums shows only accommodations of that type~~ *(superseded in ticket 32: chips no longer filter the lists)*
- [x] ~~Clicking All shows every section again~~ *(superseded in ticket 32: every section is always shown)*
- [x] The chosen chip is clearly highlighted and can be picked with the keyboard
- [x] ~~The existing City/Province filter still works together with the chosen chip~~ *(superseded in ticket 32: the chip and the lower filter are now independent)*
- [x] Works on the live URL

**Changed during ticket 32 (team feedback):** the chips no longer filter the category cards or list sections further down; those keep their original behaviour (all sections visible, cards scroll to their section). The chips now only set the search bar's Category field and narrow the live suggestions.
