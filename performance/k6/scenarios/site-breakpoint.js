// BREAKPOINT on the WEBSITE — "How many travelers at once before the
// website breaks?" The same travelers as site-stress.js (pages and data
// through /api, with the CSP and hidden-backend checks on every answer),
// but in one steady ramp that keeps going (to 400 by default) until the
// website fails, then k6 stops by itself. See lib/breakpoint.js for how to
// read the result and the settings.
// Every page reaches the backend and the HOSTED database. The team starts
// it, after perf:site:smoke. Localhost only, unless the team agreed and
// passes -e LIVE_OK=yes. On localhost, judge it on a production build
// (npm run build + npm start), not on npm run dev.
//
//   npm run perf:site:breakpoint

import { guardHeavyTest, SITE_URL } from '../lib/config.js';
import { SITE_BREAKPOINT_THRESHOLDS } from '../lib/thresholds.js';
import { BREAKPOINT_STAGES, breakpointReport, withStartTime } from '../lib/breakpoint.js';
import { setup as setupTravelers, visit } from '../lib/site.js';

guardHeavyTest('Site breakpoint', SITE_URL);

export const options = {
  stages: BREAKPOINT_STAGES,
  thresholds: SITE_BREAKPOINT_THRESHOLDS,
};

export const setup = withStartTime(setupTravelers);
export const teardown = breakpointReport;
export default visit;
