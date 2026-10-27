---
name: responsive-check
description: Measures a page or component at phone, tablet and laptop widths in the built-in browser, finds what is squeezed, cut off or overflowing and why, and checks the fix at every width. Use when something looks wrong at one screen size, or before a demo.
disable-model-invocation: true
---

Measure, don't guess. The browser pane can show an old screenshot, so
numbers from JavaScript are the source of truth.

## Steps

1. Open the page on `http://localhost:3000` in the built-in browser.
2. At each width — **375, 640, 768, 1024, 1440** — measure the element
   with `getBoundingClientRect()`: its width and height, and its parent's
   left and right edges. Also check `document.documentElement.scrollWidth
   <= innerWidth` (no sideways scroll).
3. Show a small table: width → measured size, with the broken widths in
   bold.
4. **Find the cause** before fixing. Common ones in this project:
   - A `fixed` bar centred with `left-1/2` can only use half the screen
     → give it `w-max` and `max-w-[calc(100%-2rem)]`.
   - An image or logo in a flex row shrinks → `shrink-0`.
   - A long name pushes things out → `truncate` with a `max-w-*`.
5. Fix it with Tailwind classes in the component, with a one-line
   comment saying why.
6. Measure again at every width, including a "worst case" (for example
   a long logged-in name, added temporarily with JavaScript), and show
   the before/after table.
7. Reset the browser to its normal size, run `npx eslint` on the file,
   and ask the team to check on their own laptop, tablet and phone.
