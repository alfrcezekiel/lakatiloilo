// LOAD — "Is it fine on a normal busy day, like demo day?"
// Ramp up to 20 travelers, hold for 5 minutes, ramp down. About 7 minutes.
// Change 20 to the number of travelers the team really expects.
//
//   npm run perf:load

import { THRESHOLDS } from '../lib/thresholds.js';
import { setup, visit } from '../lib/traveler.js';

export const options = {
  stages: [
    { duration: '1m', target: 20 }, // ramp up
    { duration: '5m', target: 20 }, // hold: a normal busy day
    { duration: '1m', target: 0 }, // ramp down
  ],
  thresholds: THRESHOLDS,
};

export { setup };
export default visit;
