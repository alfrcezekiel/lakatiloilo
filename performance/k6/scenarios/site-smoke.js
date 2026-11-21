// SITE SMOKE — "Do the website's pages and /api proxy work, and are they safe?"
// 1 traveler for 40 seconds on the WEBSITE (not the backend): pages plus
// data through /api/v1/... (tickets 151–153), with the CSP (ticket 156) and
// hidden-backend checks on every answer. It tours all 12 pages and routes
// in turn, so each is checked at least once. Run it before site-load.
//
//   npm run perf:site:smoke
//
// Judge speed only on a production build (npm run build + npm start, or the
// live site); `npm run dev` builds each page on first visit.

import { SITE_THRESHOLDS } from '../lib/thresholds.js';
import { setup, tour } from '../lib/site.js';

export const options = {
  vus: 1,
  duration: '40s',
  thresholds: SITE_THRESHOLDS,
};

export { setup };
export default tour;
