// SOAK — "Does it get slower or break over time?"
// 20 travelers for 60 minutes (about 64 minutes in all). Watch the backend's
// terminal for "too many connections" and compare p(95) at the start and
// the end. For a shorter run, add -e SOAK_MINUTES=30.
// Localhost only, unless the team agreed and passes -e LIVE_OK=yes.
//
//   npm run perf:soak

import { guardHeavyTest } from '../lib/config.js';
import { THRESHOLDS } from '../lib/thresholds.js';
import { setup, visit } from '../lib/traveler.js';

guardHeavyTest('Soak');

const minutes = Number(__ENV.SOAK_MINUTES) || 60;

export const options = {
  stages: [
    { duration: '2m', target: 20 },
    { duration: `${minutes}m`, target: 20 },
    { duration: '2m', target: 0 },
  ],
  thresholds: THRESHOLDS,
};

export { setup };
export default visit;
