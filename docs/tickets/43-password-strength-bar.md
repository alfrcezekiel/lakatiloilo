# 43 — Password strength bar on sign-up

**What to build:** While a traveler types a password in Sign up mode, a bar under the password field shows how strong it is: Weak, Okay or Strong. Strength comes from length and from mixing letters, numbers and symbols. The bar is only a hint; the 8-character minimum stays the real rule.

**Blocked by:** None

**Status:** in progress (tested by the team on localhost 2026-10-23; not pushed yet, so the live URL check is still open)

- [x] In Sign up mode, the bar appears once the traveler starts typing a password, and updates with every key
- [x] A short password shows Weak, a longer one Okay, and a long mix of letters, numbers and symbols Strong
- [x] The strength is written in words as well as colour, so it does not rely on colour alone, and screen readers announce it
- [x] Log in mode shows no bar
- [ ] Works on the live URL
