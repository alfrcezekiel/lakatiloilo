// BREAKPOINT on the BACKEND — "How many travelers at once before the
// backend breaks?" The same travelers as stress.js, calling the NestJS
// backend directly, but in one steady ramp that keeps going (to 400 by
// default) until the backend fails, then k6 stops by itself. See
// lib/breakpoint.js for how to read the result and the settings.
// Every request reaches the HOSTED database. The team starts it, after
// perf:smoke. Localhost only, unless the team agreed and passes
// -e LIVE_OK=yes.
//
//   npm run perf:breakpoint

import { guardHeavyTest } from '../lib/config.js';
import { BREAKPOINT_THRESHOLDS } from '../lib/thresholds.js';
import { BREAKPOINT_STAGES, breakpointReport, withStartTime } from '../lib/breakpoint.js';
import { setup as setupTravelers, visit } from '../lib/traveler.js';

guardHeavyTest('Breakpoint');

export const options = {
  stages: BREAKPOINT_STAGES,
  thresholds: BREAKPOINT_THRESHOLDS,
};

export const setup = withStartTime(setupTravelers);
export const teardown = breakpointReport;
export default visit;
