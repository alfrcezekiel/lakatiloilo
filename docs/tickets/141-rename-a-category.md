# 141 — Rename a category or kind

**What to build:** On /admin/categories, **Edit** on each category or kind lets the admin change its name (2 to 30 characters, not already used). The home page's chips, cards, lists and the place form show the new name.

**Blocked by:** None

**Status:** done

- [x] Only admins may change a name; the database refuses a wrong length or a name already used (proved with a rolled-back test)
- [x] Edit → name → Save, with plain refusals ("That name is already used.")
- [x] The eight built-in categories can be renamed too
- [x] The home page and the place form show the new name after a reload
- [x] A logged-out visitor gets 401 and a traveler 403
- [x] Works on the live URL

## Progress (2026-11-13)

- Database: supabase/sql/057-admins-rename-categories.sql, run by the team ("it worked"): admins may change only the name column (a new Row Level Security policy); the rules from 047 still check the length and that the name is not used twice. Before it runs, Save is simply refused; nothing else changes.
- Backend: PATCH /v1/admin/categories/:id { name } renames it as the admin (its id, which places point at, stays) and answers it with its place count; 400 for a wrong length, 409 "That name is already used.", 404 unknown. curl: 401 logged out and with a fake login.
- Dashboard: Edit on every category and kind opens a "New name" box with Save and Cancel (Escape cancels; the focus goes back to Edit); the line at the top says '"Food" is now "Food & Drinks". The site shows the new name.'
- Travelers: a built-in category or kind the team renamed shows its new name in the chips, the search box and its suggestions, the explore cards, the list headings ("Hotels & Condominiums" follows a renamed Hotels or Condominiums) and the place pages; one still called what it started as keeps today's wording ("Mountains & Hiking Spots"), so nothing changes until a rename. The home page already updates by itself when the categories change (ticket 117).
- `npx tsc`, eslint, `npm run build`, backend `tsc --noEmit` and the rule searches pass.
- Proof of the rules (rolled back, nothing kept): a traveler renaming Food → 0 rows; the admin renaming it to "Food & Drinks" → saved, id still "food"; one letter and 31 characters → refused (23514); "mountains" (another one's name, other capitals) → refused (23505); changing the id or applies_to → refused (no permission); the 5 places in Food still point at it.
- **Not yet checked (team, needs an admin login):** renaming in the browser, the home page and place pages showing the new name, keyboard, 320–425 px.
- Team check (2026-11-13, localhost): a renamed category updated by itself on the traveler home page (chips and sections). "ticked all the boxes of ticket 141". Only the live URL is left (ticket 150).
