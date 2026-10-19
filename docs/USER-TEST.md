# User test — Elizabeth and Mark

Ticket 27's last box ("Elizabeth and Mark have tested the app") needs real
people using the real site. This sheet keeps the test short and the same for
both of them.

**Time:** about 10 minutes each. **Device:** their own phone.
**Link:** https://lakat-iloilo.vercel.app

## How to run it

- Give them the link and the tasks below. Nothing else: no tour, no hints.
- Watch and stay quiet. If they get stuck, note where, then help.
- Write down what they say out loud, word for word if you can.

## Tasks

1. "You're planning a weekend trip around Iloilo. Find a mountain or hiking
   spot you'd like to visit."
2. "Open it and tell me where it is."
3. "Now find a food spot, but only ones in Iloilo City."
4. "Find a place to stay for the weekend, and how you'd contact them."
5. "Find a heritage site in the province, outside the city."

## Questions afterwards

1. Was anything confusing or hard to find?
2. Did any photo or detail look wrong?
3. How do you plan trips today? Would you use this instead? Why or why not?
4. What one thing would make this more useful?

## Results

| | Elizabeth | Mark |
|---|---|---|
| Date | | |
| Device / browser | | |
| Tasks finished without help (of 5) | | |
| Where they got stuck | | |
| Wrong photos or details seen | | |
| Answers to questions 1–4 | | |

When both rows are filled in, tick the box in
`docs/tickets/27-end-to-end-testing.md`. Put new feature ideas from the
test in `docs/LATER.md`, not straight into the MVP.

## Dry run by the team (before Elizabeth and Mark)

Run on 2026-10-19 by Claude, at phone width (375 px) on localhost with
the latest uncommitted changes. This is a rehearsal to catch dead ends
first. It does **not** replace Elizabeth and Mark's test.

| Task | Result | Notes |
|---|---|---|
| 1. Find a mountain spot | Pass, after a dead end | The "Mountains" chip at the top does nothing (all 7 chips link to `/`). Worked via menu → Explore → Mountains card. |
| 2. Open it, say where it is | Pass | Agony Hill shows address and coordinates. "Back to Mountains" returns to the list. |
| 3. Food spot in Iloilo City only | Pass | All 5 food spots are in the city, so the list looks the same as "All"; nothing near the lists says a filter is on. |
| 4. Place to stay + contact | Partial → fixed | Phone and email were shown, but "Call" and "Email" did nothing. Fixed: they are now `tel:` / `mailto:` links. |
| 5. Heritage site in the province | Pass | Province filter → Heritage Sites → Miag-ao Church. |

Other things a tester may notice:

- Every destination page shows made-up content: "4.7 (128 reviews)", a
  review by "John Doe", "Elevation 1,200m", a map placeholder, and
  "Share" / "Get directions" buttons that do nothing.
- Every destination page says "← Back to Mountains", even for food,
  heritage or festival spots.
- The hero's "Featured: Dinagyang Festival" and "Trending: Mt. Napulak"
  cards are not clickable, and Mt. Napulak is not in the database.
- The Foods & Dine-ins category card shows a pizza.
- Calle Real still shows a modern kitchen photo.
- No accommodations in Iloilo Province, so "Province" shows 0 hotels.
