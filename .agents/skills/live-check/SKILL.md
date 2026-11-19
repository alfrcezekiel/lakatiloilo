---
name: live-check
description: Turns a ticket's acceptance criteria into a short, numbered test the team can follow on the live URL (laptop and phone), then records their results in the ticket. Use after a push, or when the team says they tested something.
disable-model-invocation: true
---

The team, not the agent, decides when something works on the live URL.

## Before the team tests

1. Read the ticket(s) the team names (or the ones that were just
   pushed) and the matching checklist in `docs/SPEC.md`.
2. Write a **numbered test**, one line per step, each with what they
   should see:
   - Start with "Hard refresh (Ctrl+Shift+R)".
   - Say which page, what to click or type, and the exact message or
     result to expect.
   - Where it matters, what to look for in the Network tab (for example
     "a DELETE to the backend that answers 200").
   - Include one phone-width check if the ticket touches a screen.
   - Use a test account they own. Never ask for their password.
3. Ask them to report back what passed and what did not.

## After the team reports

- **Passed:** tick exactly the boxes they confirmed, add a dated note
  ("Checked by the team on the live URL, laptop and phone, YYYY-MM-DD"),
  and set the status to `done` only if every box is ticked and they
  said it is done.
- **Something's off:** ask for a screenshot or the exact message, then
  first rule out an old tab (hard refresh) before changing code.
- Do not commit the ticket update unless they ask.
