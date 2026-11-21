// The pass marks for the Lighthouse check (performance/lighthouse/run.mjs).
// They are Google's own published standards, not numbers chosen to pass.
// Never lower one just to get a ✓ (.claude/rules/testing.md). If one is
// wrong for this app, agree the new number with the team and write why.

// Lighthouse scores, 0–100. 90 and above is Lighthouse's "green" (good).
export const SCORE_BUDGETS = {
  performance: 90,
  accessibility: 90,
  "best-practices": 90,
  seo: 90,
};

// Core Web Vitals, Google's "good" limits (web.dev/vitals).
// - LCP, Largest Contentful Paint: when the main content (usually the big
//   photo or heading) has appeared.
// - CLS, Cumulative Layout Shift: how much the page jumps around while it
//   loads (0 = never).
// - TBT, Total Blocking Time: how long the page was too busy to react to a
//   tap. Lighthouse cannot measure INP (Interaction to Next Paint, the real
//   Core Web Vital for responsiveness) without a real person, so TBT is
//   its lab stand-in.
export const VITALS_BUDGETS = {
  "largest-contentful-paint": { label: "LCP", max: 2500, unit: "ms" },
  "cumulative-layout-shift": { label: "CLS", max: 0.1, unit: "" },
  "total-blocking-time": { label: "TBT (for INP)", max: 200, unit: "ms" },
};

// Shown in the summary, but not pass/fail.
export const EXTRA_METRICS = {
  "first-contentful-paint": "FCP",
  "speed-index": "Speed Index",
};

// The backend's address must never appear in a request the page makes
// (tickets 151–153; the same list as e2e/flows/hidden-backend.spec.ts).
export const BACKEND_ADDRESSES = ["localhost:5000", "127.0.0.1:5000", "api-lakat-iloilo"];
