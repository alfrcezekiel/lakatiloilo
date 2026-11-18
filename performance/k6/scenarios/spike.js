// SPIKE — "Does it survive a sudden rush, like a viral Facebook post?"
// 5 travelers, jump to 100 in 10 seconds, hold 1 minute, drop back to 5,
// then 2 more minutes to see whether it RECOVERS. About 4.5 minutes.
// Errors that continue after the spike matter more than errors during it.
// Localhost only, unless the team agreed and passes -e LIVE_OK=yes.
//
//   npm run perf:spike

import { guardHeavyTest } from '../lib/config.js';
import { HEAVY_THRESHOLDS } from '../lib/thresholds.js';
import { setup, visit } from '../lib/traveler.js';

guardHeavyTest('Spike');

export const options = {
  stages: [
    { duration: '1m', target: 5 }, // quiet
    { duration: '10s', target: 100 }, // the rush arrives
    { duration: '1m', target: 100 }, // the rush stays
    { duration: '10s', target: 5 }, // it passes
    { duration: '2m', target: 5 }, // did the app recover?
  ],
  thresholds: HEAVY_THRESHOLDS,
};

export { setup };
export default visit;
