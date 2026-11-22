// The pass/fail limits every scenario shares. If one is crossed, k6 marks
// it ✗ and finishes with a failure code.
//
// p(95) = the time 95 out of 100 requests beat. It is fairer than the
// average, which hides the slow requests that annoy people.
//
// Never loosen a limit just to get a ✓. If a number is wrong for this
// app, agree the new one with the team and write down why in
// docs/evaluations/.

export const THRESHOLDS = {
  http_req_failed: ['rate<0.01'], // fewer than 1 % of requests fail
  http_req_duration: ['p(95)<800'], // 95 % answer in under 0.8 s
  checks: ['rate>0.99'], // 99 % of answers are 200 with JSON
};

// Stress and spike push the app on purpose, so they allow more errors and
// stop by themselves (abortOnFail) once the app is clearly failing. There
// is no point pushing after it has broken. delayAbortEval gives k6 a
// minute of data before it judges.
export const HEAVY_THRESHOLDS = {
  http_req_failed: [{ threshold: 'rate<0.05', abortOnFail: true, delayAbortEval: '1m' }],
  http_req_duration: ['p(95)<1500'],
  checks: ['rate>0.95'],
};

// The website scenarios (site-*.js): the same limits as THRESHOLDS, judged
// for pages and for /api answers separately, so a slow page can't hide
// behind fast data calls. The security checks (enforced CSP, fresh nonce,
// hidden backend) must pass every single time: a security rule that holds
// 99 % of the time does not hold.
// Speed is judged only on travelers' requests (tagged kind), so setup()'s
// look-ups and warm-up visits don't count: the same 800 ms, not a looser one.
export const SITE_THRESHOLDS = {
  http_req_failed: THRESHOLDS.http_req_failed,
  checks: THRESHOLDS.checks,
  'http_req_duration{kind:page}': ['p(95)<800'],
  'http_req_duration{kind:api}': ['p(95)<800'],
  'checks{security:yes}': ['rate==1'],
};

// Website stress and spike (site-stress.js, site-spike.js): the heavy limits
// above, judged for pages and /api separately. The security checks still
// must pass 100 %: under heavy load a page may be slow or fail, but it may
// never come back without its policy or naming the backend. (Security is
// only checked on answers that came back 200; failures count in
// http_req_failed instead.)
export const SITE_HEAVY_THRESHOLDS = {
  http_req_failed: HEAVY_THRESHOLDS.http_req_failed,
  checks: HEAVY_THRESHOLDS.checks,
  'http_req_duration{kind:page}': ['p(95)<1500'],
  'http_req_duration{kind:api}': ['p(95)<1500'],
  'checks{security:yes}': ['rate==1'],
};

// Breakpoint tests (breakpoint.js, site-breakpoint.js; lib/breakpoint.js):
// the same "clearly failing" numbers as stress and spike, but EVERY limit
// stops the test (abortOnFail), because finding the moment it breaks is
// the point. delayAbortEval gives k6 a minute of data before it judges.
const stop = (threshold) => ({ threshold, abortOnFail: true, delayAbortEval: '1m' });

export const BREAKPOINT_THRESHOLDS = {
  http_req_failed: [stop('rate<0.05')],
  http_req_duration: [stop('p(95)<1500')],
  checks: [stop('rate>0.95')],
};

export const SITE_BREAKPOINT_THRESHOLDS = {
  http_req_failed: [stop('rate<0.05')],
  checks: [stop('rate>0.95')],
  'http_req_duration{kind:page}': [stop('p(95)<1500')],
  'http_req_duration{kind:api}': [stop('p(95)<1500')],
  'checks{security:yes}': [stop('rate==1')],
};
