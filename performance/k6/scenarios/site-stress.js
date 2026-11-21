// STRESS on the WEBSITE — "Where does the WEBSITE break, and how?"
// The same travelers and stages as stress.js, but on the website: pages and
// data through /api/v1/... (tickets 151–153), with the CSP and hidden-
// backend checks (ticket 156) on every answer. Each page also reaches the
// backend and the HOSTED database. The team starts it, after site-smoke.
// Localhost only, unless the team agreed and passes -e LIVE_OK=yes.
// Judge speed on a production build (npm run build + npm start), not on
// npm run dev.
//
//   npm run perf:site:stress

import { guardHeavyTest, SITE_URL } from '../lib/config.js';
import { SITE_HEAVY_THRESHOLDS } from '../lib/thresholds.js';
import { setup, visit } from '../lib/site.js';

guardHeavyTest('Site stress', SITE_URL);

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '1m', target: 20 },
    { duration: '30s', target: 50 },
    { duration: '1m30s', target: 50 },
    { duration: '30s', target: 100 },
    { duration: '1m30s', target: 100 },
    { duration: '30s', target: 150 },
    { duration: '1m30s', target: 150 },
    { duration: '1m', target: 0 },
  ],
  thresholds: SITE_HEAVY_THRESHOLDS,
};

export { setup };
export default visit;
