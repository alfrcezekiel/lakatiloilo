---
paths:
  - "src/**"
---

# Next.js frontend rules

## Talking to the backend

- All calls to the NestJS backend live in `src/lib/api.ts` (axios).
  In the browser they go to `/api/v1/...` (the proxy in
  `src/app/api/[...path]/route.ts`); on the server straight to the
  server-only `API_URL`. Never add a `NEXT_PUBLIC_` backend address.
  Components never build backend URLs or `fetch` the backend themselves.
- Writes send the traveler's token from `loginToken()` in
  `src/lib/auth.ts` as `Authorization: Bearer …`.
- Show the backend's own refusal with `backendMessage(error)`, and fall
  back to "Something went wrong. Please try again."
- The Supabase browser client is only for the login session itself:
  `setSession` after a backend log-in, log-out, Forgot password and Set
  new password. Never for places or reviews.
- Exception (live updates round, team decision 2026-11-02): it may also
  listen to Supabase Realtime as a doorbell ("a row in this table
  changed"), then ask the backend again. Never use the rows Realtime
  sends, and never subscribe to review_reports.
- Exception (reviews & media round, team decision 2026-11-22, ticket 165):
  the browser may upload **a review video** straight into the traveler's
  own folder of the `review-videos` Storage bucket, with the traveler's own
  login and the public (anon) key (`src/lib/review-video.ts`), because a
  video is too big for the backend (Vercel stops at 4.5 MB), and may delete
  that same just-uploaded file again if attaching it fails (code review
  2026-11-23, `deleteUploadedVideo`). Only that:
  never another bucket, never someone else's folder, never a table. The
  backend then checks the file and attaches it (POST
  /v1/reviews/:id/video); Storage policies decide who may write
  (supabase/sql/065).

## Screens

- Outcomes the traveler must notice (account created, password changed)
  use `StatusModal`. Smaller confirmations use a `role="status"` line
  near the thing that changed.
- Messages are friendly, complete sentences that say what to do next.
- **Check layout at 375, 768, 1024 and 1440 px wide.** Measure with
  JavaScript (`getBoundingClientRect`), not only by looking. The browser
  pane can show an old screenshot.
- **Phone widths (425, 375, 320 px):** a row of buttons must not wrap
  into uneven rows (team report 2026-11-11, Places). Use a grid of equal
  columns (`grid grid-cols-3`), let long labels sit under their icon, and
  give paging a compact "‹ Previous · Page 2 of 4 · Next ›" row, keeping
  the full row of pills from `sm:` up. Every button stays at least 44 px
  tall and wide. Measure each width, not only one.
- How to measure them: the browser window cannot always shrink that far,
  and the site refuses to be shown in a frame (X-Frame-Options DENY, keep
  it). Open the page in a small pop-up from a real click on a temporary
  button, then `resizeTo` the pop-up to each width and measure with
  `getBoundingClientRect` (one line = the same vertical middle; nothing
  wider than the screen).
- A bar that is `fixed` and centred with `left-1/2 -translate-x-1/2` can
  only use half the screen unless it has a width (`w-max` plus a
  `max-w-[calc(100%-2rem)]`). Logos and icons in a flex row get
  `shrink-0`.

## No white backdrop or white shadow on hover, click or highlight

Team request (2026-11-06; moved here from its own file on 2026-11-11).
In the navbar's profile dropdown, hovering or clicking "My profile" /
"Log out" showed a see-through white box behind the item
(`hover:bg-white/10`). On the glass teal design it looks like a glitch.
The team does not want it anywhere in the app.

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

What is still allowed:

- Buttons that already have a glass fill when nothing is happening
  (`bg-white/10`, `bg-white/15` — the profile icon, Scroll to top,
  category chips, the glass `Button` variant) may brighten that fill on
  hover. There is no "new" box appearing, only the same button getting
  lighter.
- Solid white buttons (`bg-white` with teal text) may use
  `hover:bg-white/90`.

### No white shadow (light bands) behind the dropdown

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
- Blur is only for things over a **photo** on the traveler's site (hero
  search box, category chips, the back link on a place photo, the place
  page's side panel, which rises into the photo on a laptop, the login
  card) and the dim layer behind a modal or the phone menu. Never on the
  admin dashboard (next section).
- Anything clickable is a real `<button>` or link, never a `<span>` or
  `<div>` with `onClick` (evaluation 2026-11-12: the navbar's Home /
  About / Features / Explore were plain text, so a keyboard could not
  reach them; WCAG 2.1.1). Buttons styled as text keep `select-none`, so
  clicking them does not leave a blue selection box.

## No black backdrop on the admin dashboard

Team request (2026-11-11). On every dashboard page (Overview, Reviews,
Reports, Places, Categories) hovering or clicking a card showed a black
backdrop. Root cause: the same as the white bands above, on a dark
background. Every glass panel used `backdrop-blur-xl` with `shadow-2xl`
over the fixed background photo, so each hover or focus change inside a
card made Chrome redraw the blur in tiles, and the seams showed black.
Clicking a card also gave it an amber outline, because the cards take
focus (`tabIndex={-1}`) and the outline used `focus:`.

- **No `backdrop-blur-*` and no big shadows (`shadow-xl`, `shadow-2xl`)
  on dashboard panels, cards or rows.** Use `adminGlass` from
  `AdminFrame.tsx`: `border border-white/20 bg-teal-950/60`, see-through
  glass without blur.
- **No dark tint on hover, press or focus** either — no
  `hover:bg-black/…`, `active:bg-black/…`, `focus:bg-black/…` or
  `hover:bg-teal-…` on cards and rows. Show hover by brightening the
  border or the text, as above.
- **Bars that float over the dashboard as it scrolls are solid**
  (`bg-teal-900`): the phone top bar.
- **Cards that can take focus show their outline only for the keyboard:**
  `focus-visible:outline-…` with `focus:outline-none`, never a plain
  `focus:outline-…`, so a mouse click leaves no frame.
- Allowed: the dim layer behind a pop-up (`backdrop:bg-black/60` on a
  `<dialog>`), and solid floating lines such as the Undo line.

## Before finishing a change

Search for new tints, blurs and shadows, and check each hit against the
rules above:

```bash
git grep -nE "(hover|active|focus|data-\[[^]]+\]):bg-(white|black)" -- src
```

```bash
git grep -nE "backdrop-blur|shadow-(xl|2xl)" -- src
```

```bash
git grep -nP "focus:outline-(?!none)" -- src/components/admin
```

## Fix every yellow or red Tailwind warning right away

Team rule (2026-11-11). A class the editor underlines in yellow
(a warning) or red (an error) is fixed in the same change, never left
for later. The editor's Tailwind CSS extension flags two kinds:

- **Two classes setting the same thing** in one class list, for example
  `px-4 px-6` or `text-sm text-base` with the same prefix (`hover:`,
  `sm:`, …). Keep the one that is meant. Different prefixes are fine
  (`focus:outline-none focus-visible:outline-2`). Classes that change
  with a condition go through `cn(...)`, which keeps only the last one.
- **A long form where Tailwind v4 has a standard short one.** Use the
  short one. The ones this project has met (each checked to make the
  same CSS):

  | Instead of | Write |
  |---|---|
  | `break-words` | `wrap-break-word` |
  | `has-[:focus-visible]:` | `has-focus-visible:` |
  | `outline-offset-[-2px]` | `-outline-offset-2` |
  | `h-[32rem]` (a size or space in whole quarter-rems) | `h-128` (N × 4) |
  | `rounded-[var(--radius)]` | `rounded-(--radius)` |
  | `scale-[0.97]` | `scale-97` |
  | `flex-shrink-0`, `flex-grow` | `shrink-0`, `grow` |
  | `bg-gradient-to-br` | `bg-linear-to-br` |

  Text sizes such as `text-[0.7rem]` have no short form and stay.

TypeScript and ESLint warnings (also yellow) and errors (red) are fixed
the same way: `npx tsc --noEmit` and `npx eslint src` must show none.

Claude cannot see the editor's highlights, so it searches for the forms
above (the command below), and the team says when the editor still shows
one, with the file and the message; it is then added to the table.

```bash
grep -rnE "\bbreak-words\b|has-\[:|outline-offset-\[-|\b(h|w|size|min-h|min-w|max-h|max-w|p[xytblr]?|m[xytblr]?|gap|top|left|right|bottom|inset)-\[[0-9.]+rem\]|rounded-\[var\(|scale-\[0\.|flex-shrink|flex-grow|bg-gradient-to" src
```

## Checking

- `npx tsc --noEmit`, `npx eslint <files>`, and `npm run build` before
  saying a ticket is ready (the build is what Vercel runs).
- Run the searches above (tints, blurs, shadows, Tailwind short forms)
  on every change, including new files: `git grep` skips files git does
  not know yet, so use `grep -r` for those.
