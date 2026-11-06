---
paths:
  - "src/**"
---

# No white backdrop or white shadow on hover, click or highlight

Team request (2026-11-06). In the navbar's profile dropdown, hovering or
clicking "My profile" / "Log out" showed a see-through white box behind
the item (`hover:bg-white/10`). On the glass teal design it looks like a
glitch. The team does not want it anywhere in the app.

## The rule

- **Never put a white tint behind an item when it is hovered, pressed,
  focused or highlighted** — no `hover:bg-white/…`, `active:bg-white/…`,
  `focus:bg-white/…`, `data-[…]:bg-white/…`, or a `bg-white/…` class added
  for the "active" item, on anything that has no background of its own.
  This covers dropdown and menu items, search suggestions, list rows,
  the unselected side of pill switchers (All / Iloilo City / Iloilo
  Province, Log in / Sign up), and option rows in forms.
- **Show hover and highlight with colour instead:**
  - Menu and dropdown items, list suggestions: the text turns
    `text-amber-300` (the colour of the open profile icon).
  - Pill switchers, unselected side: `text-white/80`, then
    `hover:text-white`. The selected side keeps its solid `bg-white`.
  - Bordered rows and cards: brighten the border
    (`hover:border-white/50`), not the fill.
- The keyboard highlight must stay visible (WCAG 2.4.7). Keep the
  `focus-visible:outline-white` outlines, and give an arrow-key
  highlighted option a colour change like the hover one.

## What is still allowed

- Buttons that already have a glass fill when nothing is happening
  (`bg-white/10`, `bg-white/15` — the profile icon, Scroll to top,
  category chips, the glass `Button` variant) may brighten that fill on
  hover. There is no "new" box appearing, only the same button getting
  lighter.
- Solid white buttons (`bg-white` with teal text) may use
  `hover:bg-white/90`.

## No white shadow (light bands) behind the dropdown

Team request (2026-11-06, second report). Hovering or clicking the
navbar dropdown made light "white shadow" bands appear across the About
and Features cards under it. Root cause: those cards used
`backdrop-blur` (a frosted-glass filter). Every time the dropdown faded
in or changed on hover, Chromium/Brave redrew the blur in tiles and the
seams showed as light stripes.

- **No `backdrop-blur-*` on anything that sits on a plain colour or
  gradient background** — section cards, stat tiles, pill
  switchers. There is nothing behind them to blur, so it only adds the
  stripes. Use the plain glass fill (`bg-white/15 border border-white/25`).
- **Floating bars and dropdowns are solid, not blurred:** the navbar,
  the profile dropdown and the phone menu use `bg-teal-900` with no
  `backdrop-blur`. A blurred layer floating over other content is what
  makes the browser redraw.
- Blur is only for things over a **photo** (hero search box, category
  chips, the back link on a place photo, the place page's side panel,
  which rises into the photo on a laptop, the login card) and the dim
  layer behind a modal or the phone menu.
- Clickable text that is not a real link or button (the navbar's Home /
  About / Features / Explore) gets `select-none`, so clicking it does not
  leave a blue selection box.

## Before finishing a change

Search for new tints and new blurs, and check each hit against the rule:

```bash
git grep -nE "(hover|active|focus|data-\[[^]]+\]):bg-white" -- src
```

```bash
git grep -n "backdrop-blur" -- src
```
