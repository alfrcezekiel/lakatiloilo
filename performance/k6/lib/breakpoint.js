// BREAKPOINT tests (breakpoint.js, site-breakpoint.js) — "How many
// travelers at once before the app breaks?"
//
// Stress stops at 150 travelers and never broke the app (2026-11-21), so
// where it breaks was still unknown. A breakpoint test keeps adding
// travelers in one steady ramp, and k6 stops it by itself (abortOnFail)
// the moment the app counts as broken:
//   - more than 5 % of requests fail, or
//   - 95 % of answers take longer than 1.5 s,
// the same "clearly failing" limits stress and spike use (thresholds.js),
// so a breakpoint means the same thing as a stress ✗. On the website the
// security checks must still pass 100 %: a page that comes back without
// its policy, or naming the backend, also stops the test.
//
// Reading the result: the summary's `vus ... max=` is how many travelers
// were on the site when k6 stopped. The app broke a little before that,
// because k6 judges p(95) over the whole run so far, so it notices a
// slow-down late. If every threshold is ✓ and k6 ran to the end, the app
// did not break up to BREAK_MAX_VUS travelers.
//
// This is the heaviest test in the project. Every request also reaches
// the HOSTED database, so the team starts it, never the agent, after the
// smoke passes. Localhost only unless the whole team agreed and passes
// -e LIVE_OK=yes. On localhost the laptop itself (website, backend and
// k6 together) may be what breaks first; on the live URL, Vercel's
// firewall may start refusing what looks like an attack. Both are worth
// knowing, and the summary does not tell them apart: say which one it was
// in docs/evaluations/.
//
// Settings (each with -e NAME=value):
//   BREAK_MAX_VUS  the most travelers it ramps to (default 400, 160–1000)
//   BREAK_MINUTES  how long the ramp from 0 to that takes (default 20, 5–60)

const MAX_VUS = Number(__ENV.BREAK_MAX_VUS || 400);
const MINUTES = Number(__ENV.BREAK_MINUTES || 20);

if (!Number.isInteger(MAX_VUS) || MAX_VUS < 160 || MAX_VUS > 1000) {
  throw new Error(
    `BREAK_MAX_VUS=${__ENV.BREAK_MAX_VUS} must be a whole number from 160 to 1000. ` +
      'Under 160 is what stress already checks; over 1000 is more than this project ever needs.',
  );
}
if (!Number.isFinite(MINUTES) || MINUTES < 5 || MINUTES > 60) {
  throw new Error(`BREAK_MINUTES=${__ENV.BREAK_MINUTES} must be from 5 to 60.`);
}

// One straight ramp: about 20 more travelers a minute with the defaults,
// slow enough to see the speed change, and no plateau to rest on.
export const BREAKPOINT_STAGES = [{ duration: `${MINUTES}m`, target: MAX_VUS }];
export { MAX_VUS as BREAK_MAX_VUS, MINUTES as BREAK_MINUTES };

// When the app breaks, k6 itself only prints "ERRO … thresholds … were
// crossed … stopping test prematurely" and ends with code 99. That is the
// test's RESULT, not a script error, but it reads like a crash (team run
// 2026-11-22). So setup() notes when the ramp starts, and teardown(), which
// k6 still runs after stopping, says in plain words how far it got. The
// ramp is a straight line, so the time tells how many travelers were on.
export function withStartTime(setupTravelers) {
  return () => ({ ...setupTravelers(), rampStartedAt: Date.now() });
}

export function breakpointReport(data) {
  const minutes = (Date.now() - data.rampStartedAt) / 60000;
  const travelers = Math.min(MAX_VUS, Math.round((MAX_VUS * minutes) / MINUTES));
  const ranToTheEnd = minutes >= MINUTES;
  console.log(
    ranToTheEnd
      ? `BREAKPOINT RESULT: the app did not break. It held up to ${MAX_VUS} travelers at once ` +
          `(${MINUTES}-minute ramp). Try a higher -e BREAK_MAX_VUS= to look further.`
      : `BREAKPOINT RESULT: the app reached its limit at about ${travelers} travelers at once, ` +
          `after ${minutes.toFixed(1)} of ${MINUTES} minutes. This is the answer the test looks for, ` +
          `not a script error: the "ERRO … stopping test prematurely" line and exit code 99 mean k6 ` +
          `stopped on purpose. The ✗ line under THRESHOLDS shows which limit broke. The real limit ` +
          `is a little lower, because p(95) is judged over the whole run so far.`,
  );
}
