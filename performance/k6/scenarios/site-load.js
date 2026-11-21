// SITE LOAD — "Is the website fine on demo day, now that every page is built
// per visit (nonce CSP) and every data call goes through /api?"
// The same shape as load.js: ramp to 20 travelers, hold 5 minutes, ramp
// down (about 7 minutes). Every page also reaches the backend and the HOSTED
// database. The team starts it, after site-smoke passes.
// Like load.js it may run on localhost or the live site; the team starts it.
//
//   npm run perf:site:load

import { SITE_THRESHOLDS } from '../lib/thresholds.js';
import { setup, visit } from '../lib/site.js';

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
