# 117 — New categories on the home page

**What to build:** The home page takes its categories and kinds from the list instead of a fixed one. A new category or kind with at least one place gets its chip, its card and its list like the existing ones, with a general icon and the photo of its first place. The eight existing ones keep their icons and photos.

**Blocked by:** 116

**Status:** todo

- [x] A new category with one place shows on the home page with its chip, card and list; one with no places is not shown
- [x] The eight existing categories and kinds look and work as before
- [x] Adding a category from the dashboard shows on an open home page without a reload
- [x] Works at 375 px and on a laptop
- [ ] Works on the live URL

## Progress (2026-11-10)

- The home page's server part also asks GET /v1/categories. If that fails, the page shows the eight built-in ones.
- A category or kind that is not one of the eight and has at least one place gets:
  - a chip under the search bar
  - a card in "What do you want to explore?" with a general icon (a pin for a category, a bed for a kind) and the photo of its first place
  - for a destination category, its own list after the built-in ones; a new kind shares the accommodations list, whose heading becomes "Places to stay"
  - its name in the search bar's suggestions and Category field, and on the place page
- One with no places is not shown. The eight built-in ones are untouched.
- The home page listens to place_categories (Realtime), so adding or deleting one refreshes an open page.

Checked:
- In the browser (logged out): the home page shows the same 8 chips, 8 cards with their counts and 7 lists as before.
- The helper with made-up data: a new category and a new kind that have a place are returned with that place's photo; one with no places is left out; a built-in one is not repeated.
- Type-check, lint and `npm run build`.

Not checked:
- A real new category on the page. That needs a place to use it, which ticket 118 makes possible (changing a place's category in the Edit form).
- 375 px.
- The live URL.

**Team check (2026-11-11, localhost):** the team confirmed every box on localhost. Still open: the live URL.
