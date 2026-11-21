// SPIKE on the WEBSITE — "Does the website survive a viral post?"
// The same travelers and stages as spike.js, but on the website: pages and
// data through /api/v1/... (tickets 151–153), with the CSP and hidden-
// backend checks (ticket 156) on every answer. Each page also reaches the
// backend and the HOSTED database. The team starts it, after site-smoke.
// Localhost only, unless the team agreed and passes -e LIVE_OK=yes.
// Judge speed on a production build (npm run build + npm start), not on
// npm run dev.
//
//   npm run perf:site:spike

import { guardHeavyTest, SITE_URL } from '../lib/config.js';
import { SITE_HEAVY_THRESHOLDS } from '../lib/thresholds.js';
import { setup, visit } from '../lib/site.js';

guardHeavyTest('Site spike', SITE_URL);

export const options = {
  stages: [
    { duration: '1m', target: 5 }, // quiet
    { duration: '10s', target: 100 }, // the rush arrives
    { duration: '1m', target: 100 }, // the rush stays
    { duration: '10s', target: 5 }, // it passes
    { duration: '2m', target: 5 }, // did the app recover?
  ],
  thresholds: SITE_HEAVY_THRESHOLDS,
};

export { setup };
export default visit;
