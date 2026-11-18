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
