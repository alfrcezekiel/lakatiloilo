// Where k6 sends its traffic, and the safety guard for heavy tests.
//
// BASE_URL is the BACKEND's address (the NestJS API), never the Supabase
// address. Pass it with -e, which works the same in PowerShell and Git Bash:
//   k6 run -e BASE_URL=http://localhost:5000 performance/k6/scenarios/smoke.js
//
// Remember: even the local backend uses the HOSTED Supabase database, so
// every k6 request is real traffic. See docs/TESTING.md, "Safety first".

export const BASE_URL = (__ENV.BASE_URL || 'http://localhost:5000').replace(/\/+$/, '');

// Every test, light or heavy, refuses to send traffic to Supabase directly.
if (BASE_URL.includes('supabase.co')) {
  throw new Error('Never load-test Supabase directly. Use our API URL, for example http://localhost:5000.');
}

// Stress, spike and soak call this at the top of their file, so k6 stops
// before sending a single request if the target is the live site and the
// team has not said yes. Only the team adds -e LIVE_OK=yes.
export function guardHeavyTest(name) {
  const isLocal = /^https?:\/\/(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(BASE_URL);
  if (!isLocal && __ENV.LIVE_OK !== 'yes') {
    throw new Error(
      `${name} is a heavy test and ${BASE_URL} is not localhost. Run it against ` +
        'http://localhost:5000, or add -e LIVE_OK=yes only after the whole team has ' +
        'agreed to test the live URL at a quiet time.',
    );
  }
}
