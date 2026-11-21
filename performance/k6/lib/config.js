// Where k6 sends its traffic, and the safety guard for heavy tests.
//
// BASE_URL is the BACKEND's address (the NestJS API), never the Supabase
// address. Pass it with -e, which works the same in PowerShell and Git Bash:
//   k6 run -e BASE_URL=http://localhost:5000 performance/k6/scenarios/smoke.js
//
// Remember: even the local backend uses the HOSTED Supabase database, so
// every k6 request is real traffic. See docs/TESTING.md, "Safety first".

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

// SITE_URL is the WEBSITE's address (Next.js). The site-*.js scenarios use
// it: they visit pages and call /api/v1/..., the proxy the browser really
// uses since tickets 151–153, so they measure what a traveler waits for
// (website → proxy → backend → database), and check on every answer that
// the Content-Security-Policy (ticket 156) is enforced and the backend's
// address stays hidden.
//   k6 run -e SITE_URL=http://localhost:3000 performance/k6/scenarios/site-smoke.js
export const SITE_URL = (__ENV.SITE_URL || 'http://localhost:3000').replace(/\/+$/, '');

// Every test, light or heavy, refuses to send traffic to Supabase directly.
if (BASE_URL.includes('supabase.co') || SITE_URL.includes('supabase.co')) {
  throw new Error('Never load-test Supabase directly. Use our API URL, for example http://localhost:5000.');
}

// Stress, spike and soak call this at the top of their file, so k6 stops
// before sending a single request if the target is the live site and the
// team has not said yes. Only the team adds -e LIVE_OK=yes.
// The site scenarios pass SITE_URL as `target`.
export function guardHeavyTest(name, target = BASE_URL) {
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(target);
  if (!isLocal && __ENV.LIVE_OK !== 'yes') {
    throw new Error(
      `${name} is a heavy test and ${target} is not localhost. Run it against ` +
        `${target === BASE_URL ? 'http://localhost:5000' : 'http://localhost:3000'}, or add -e LIVE_OK=yes only after the whole team has ` +
        'agreed to test the live URL at a quiet time.',
    );
  }
}
