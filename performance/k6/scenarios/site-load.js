// SITE LOAD — "Is the website fine on demo day, now that every page is built
// per visit (nonce CSP) and every data call goes through /api?"
// The same shape as load.js: ramp to 20 travelers, hold 5 minutes, ramp
// down (about 7 minutes). Every page also reaches the backend and the HOSTED
// database. The team starts it, after site-smoke passes.
// Localhost only, unless the team agreed and passes -e LIVE_OK=yes.
//
//   npm run perf:site:load

import { guardHeavyTest, SITE_URL } from '../lib/config.js';
import { SITE_THRESHOLDS } from '../lib/thresholds.js';
import { setup, visit } from '../lib/site.js';

guardHeavyTest('Site load', SITE_URL);

export const options = {
  stages: [
    { duration: '1m', target: 20 },
    { duration: '5m', target: 20 },
    { duration: '1m', target: 0 },
  ],
  thresholds: SITE_THRESHOLDS,
};

export { setup };
export default visit;
