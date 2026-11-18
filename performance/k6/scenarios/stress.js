// STRESS — "Where is the breaking point, and how does it break?"
// Steps of 20 → 50 → 100 → 150 travelers, 2 minutes each. About 10 minutes.
// Stops by itself once more than 5 % of requests fail.
// Localhost only, unless the team agreed and passes -e LIVE_OK=yes.
//
//   npm run perf:stress

import { guardHeavyTest } from '../lib/config.js';
import { HEAVY_THRESHOLDS } from '../lib/thresholds.js';
import { setup, visit } from '../lib/traveler.js';

guardHeavyTest('Stress');

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
  thresholds: HEAVY_THRESHOLDS,
};

export { setup };
export default visit;
