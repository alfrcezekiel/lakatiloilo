# 58 — Icons from one set

**What to build:** Every icon on the site comes from one icon set (Lucide, already installed) instead of emoji, so icons look the same everywhere: the Features cards, the category cards, the address pin on detail pages, the navbar menu's close button, the back and "View details" arrows, and the footer heart. Stars stay gold.

**Blocked by:** None

**Status:** in progress

- [ ] The Features cards and the category cards show Lucide icons, no emoji
- [ ] The detail pages' address pin and Back button, the "View details" arrows, the menu's close button and the footer heart are Lucide icons
- [ ] Icons that only decorate are hidden from screen readers; buttons that are only an icon (like close) still have a name screen readers read out
- [ ] Nothing shifts or wraps differently at 375, 768, 1024 and 1440 px wide
- [ ] Works on the live URL

**Progress (2026-11-01):** Swapped every emoji icon for a Lucide icon: the seven Features cards, the eight category cards and their place-count arrows, the detail pages' Back button and address pin, the "View details" arrows, the photo credits Back button, the phone menu's close button, the footer heart, the tick in the "account created" pop-up and the "review deleted" note. Gold stars stay as they were. The footer heart has the name "love" for screen readers, since it is part of the sentence. Both phone menu buttons (open and close) now have names, "Open menu" and "Close menu"; the open button had none before. Fixed on the way: the first category card's icon was squashed to 40×28 on a phone, because its long name wrapped and the card shrank the icon to make room. Checked on localhost: no emoji left in the code except the stars; every icon measured at its full size and no sideways scrolling at 375, 768, 1024 and 1440 px; the menu opens and closes, and the open button reports whether it is open. Type-check, lint and `npm run build` pass. Not checked: the live URL.
