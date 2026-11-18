// SMOKE — "Does the script work, and is the app up?"
// 1 traveler for 30 seconds. Always run this before any bigger test.
// If it fails, fix the script (or start the backend) first.
//
//   npm run perf:smoke

import { THRESHOLDS } from '../lib/thresholds.js';
import { setup, visit } from '../lib/traveler.js';

export const options = {
  vus: 1,
  duration: '30s',
  thresholds: THRESHOLDS,
};

export { setup };
export default visit;
