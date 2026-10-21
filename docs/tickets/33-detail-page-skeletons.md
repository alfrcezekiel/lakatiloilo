# 33 — Detail page skeletons

**What to build:** While a destination or accommodation page is waiting for the NestJS backend, the traveler sees a skeleton laid out like the real page — photo block, title bar, a few text lines and the back button — instead of a blank screen. The grey pulsing skeleton block built here is reused by every later skeleton ticket.

**Blocked by:** None

**Status:** done

- [x] One reusable skeleton block exists, built with the existing Tailwind setup (no new library)
- [x] Opening a destination shows its skeleton first, then the real page
- [x] Opening an accommodation shows its skeleton first, then the real page
- [x] The Back to Home button works while the skeleton is showing
- [x] Screen readers announce "Loading places"
- [x] With "reduce motion" turned on, the skeleton stays still instead of pulsing
- [x] Works on the live URL
