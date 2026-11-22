# Page quality (Lighthouse), live site after ticket 158 — 2026-11-22

**Why:** the first live phone check after ticket 158 ("Lighter pages on a
phone", commit `90d5942`, pushed with `b47e4bd`). **Tool:** Lighthouse
13.6.0, `npm run perf:lighthouse:mobile` · **Target:**
`https://lakat-iloilo.vercel.app` · **Run by:** the team, laptop on the
charger (CPU score 2,580–3,098, no battery warning) · **Pass marks:**
unchanged.

Checked first that the live site serves the new code: home now starts
with 17 scripts, not 18. The Supabase code is no longer one of them; it
arrives after the page is on screen (its 81 ms task at 6.8 s in the
report, as designed).

## Run 1 of 2

| Page · phone | Perf. | A11y | Best pr. | SEO | LCP (≤ 2.5 s) | CLS | TBT (≤ 200 ms) | Security |
|---|---|---|---|---|---|---|---|---|
| Home | 97 ✓ | 100 | 100 | 100 | 1.00 s ✓ | 0 ✓ | **201 ms ✗** (by 1 ms) | ✓ ✓ ✓ |
| Place | 97 ✓ | 100 | 100 | 100 | **2.15 s ✓** | 0 ✓ | 149 ms ✓ | ✓ ✓ ✓ |
| Log in | 100 | 100 | 100 | 100 | 0.96 s ✓ | 0.031 ✓ | 37 ms ✓ | ✓ ✓ ✓ |

## Before and after ticket 158 (live, phone, on the charger)

| | Before (2026-11-21, five runs) | After (run 1) |
|---|---|---|
| Home TBT | 325, 237, 284, 186, 246 ms (4 of 5 over) | **201 ms** |
| Home Performance | 89–97 | 97 |
| Place LCP | 2.60, 3.36, 3.22, 2.75, 2.60 s (all over) | **2.15 s ✓** |
| Place Performance | 81–97 | 97 |

- **Place LCP passes for the first time on the live phone test**: 2.15 s,
  0.45 s faster than the best run before. The header photo is ready in
  about 0.33 s on the real load (first byte 43 ms, load delay 172 ms,
  download 68 ms, render 50 ms). In the simulated slow phone it now gets
  the connection sooner, because the 67 KB of Supabase code no longer
  downloads first.
- **Home TBT 201 ms: 1 ms over.** It is much lower than before (the
  average of the five runs was 256 ms), but one run cannot say whether it
  passes. TBT moves about ±40 ms between runs, so 1 ms over is within
  that noise. Its biggest pieces are React drawing the page (165 and
  92 ms tasks), the Next.js loader (109 ms) and the Supabase code
  arriving later (81 ms, 6.8 s in).
- Every score is 97–100, and all 9 security checks pass.

## Ticket 158's boxes

The ticket asks for **2 runs out of 2** on the charger. This is run 1:
place LCP ✓, home TBT ✗ by 1 ms. No code change on one run (the team
rule: run twice before judging). **Next: a second run.** If home TBT is
under 200 ms there, both phone boxes can be ticked once the team
confirms. If it is over again, the next thing to try is moving the
Supabase code's 81 ms task later.

## Run 2 of 2 (same laptop, on the charger, CPU score 3,092, 3 minutes later)

| Page · phone | Perf. | A11y | Best pr. | SEO | LCP (≤ 2.5 s) | CLS | TBT (≤ 200 ms) | Security |
|---|---|---|---|---|---|---|---|---|
| Home | 97 ✓ | 100 | 100 | 100 | 0.97 s ✓ | 0 ✓ | **184 ms ✓** | ✓ ✓ ✓ |
| Place | 95 ✓ | 100 | 100 | 100 | **2.60 s ✗** | 0 ✓ | 140 ms ✓ | ✓ ✓ ✓ |
| Log in | 100 | 100 | 100 | 100 | 0.95 s ✓ | 0.031 ✓ | 28 ms ✓ | ✓ ✓ ✓ |

## Both runs together: each budget passed once and missed once, by a hair

| | Run 1 | Run 2 | Before ticket 158 |
|---|---|---|---|
| Home TBT (≤ 200 ms) | 201 ms ✗ | **184 ms ✓** | 186–325 ms, average 256 |
| Place LCP (≤ 2.5 s) | **2.15 s ✓** | 2.60 s ✗ | 2.60–3.36 s, average 2.91 |

**Ticket 158 made both measurably better, but neither passes 2 runs out
of 2 yet.** Each now sits right on its line, and which side it lands on
changes from run to run with the same code, on the same laptop, three
minutes apart.

**Why the place LCP moves between 2.15 and 2.60 s:** on the real page
load the photo is the **first** thing requested after the page (at 343
ms, High priority, before all 18 scripts) and is ready by about 0.41 s.
The miss exists only in Lighthouse's *simulated* slow phone, which
estimates the time from a model of the page's requests and script work
(1.6 Mbit/s, CPU 4× slower). That estimate moves by about 0.45 s
between runs here. Lighthouse's *real* throttling gave 1.96 s ✓
(2026-11-21). The photo itself has nothing left to fix: five ideas were
tried on it, and none moved the simulated number reliably below 2.5 s.

**Stopped here, as the team rule asks** ("same error twice: stop and
explain"). The budgets stay at Google's limits. The team decides how to
close ticket 158 (next section).

## What the team can decide

1. **Close 158 as "much better, not fully met".** Record both remaining
   misses as known: home TBT and place LCP are each within run-to-run
   noise of their limit, and the real page load is fast. No more code.
2. **Keep 158 open for a bigger change.** The only lever left for both is
   less JavaScript overall (React and Next.js themselves are 120 KB of
   the 340 KB), which means redesigning how pages are built (more parts
   rendered on the server only). That is a large change and a risk
   before the demo.
3. **Look at real travelers instead of the lab.** Vercel Speed Insights
   measures real visitors' LCP and INP. It is a Vercel add-on, so it
   would need the team's agreement (CLAUDE.md: no new services without
   asking).

## Decision (2026-11-22, team)

**Option 1: ticket 158 is closed as "much better, not fully met".** Both
remaining misses are known and accepted: home TBT (average 193 ms over
the two runs, limit 200) and place LCP (average 2.38 s, limit 2.5 s, real
load about 0.41 s). The budgets stay at Google's limits. No more code
for this before the demo.

