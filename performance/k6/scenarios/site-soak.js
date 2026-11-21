// SOAK on the WEBSITE — "Does the website slow down over an hour?"
// The same travelers and stages as soak.js, but on the website: pages and
// data through /api/v1/... (tickets 151–153), with the CSP and hidden-
// backend checks (ticket 156) on every answer. Each page also reaches the
// backend and the HOSTED database. The team starts it, after site-smoke.
// Localhost only, unless the team agreed and passes -e LIVE_OK=yes.
// Judge speed on a production build (npm run build + npm start), not on
// npm run dev.
//
//   npm run perf:site:soak

import { guardHeavyTest, SITE_URL } from '../lib/config.js';
import { SITE_THRESHOLDS } from '../lib/thresholds.js';
import { setup, visit } from '../lib/site.js';

guardHeavyTest('Site soak', SITE_URL);

const minutes = Number(__ENV.SOAK_MINUTES) || 60;

export const options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: `${minutes}m`, target: 20 },
    { duration: '2m', target: 0 },
  ],
  thresholds: SITE_THRESHOLDS,
};

export { setup };
export default visit;
