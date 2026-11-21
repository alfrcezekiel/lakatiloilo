// What one pretend traveler does on the WEBSITE (the site-*.js scenarios):
// open pages, and fetch data through /api/v1/..., the website's proxy to the
// backend (tickets 151–153). traveler.js calls the backend directly; this
// file measures the path a real browser takes.
//
// On top of speed, every answer is checked for the two security changes
// pushed in tickets 151–156, so a fix that is fast but unsafe still fails:
//   - pages: an ENFORCED Content-Security-Policy (not report-only), with a
//     fresh nonce for scripts on every visit and no 'unsafe-inline' script;
//   - pages and /api answers: the backend's address never appears, and the
//     proxy passes back no backend headers (only content-type and
//     cache-control, src/app/api/[...path]/route.ts).
//
// Public GET requests only: no login, no token, no cookie (.claude/rules/testing.md).

import http from 'k6/http';
import exec from 'k6/execution';
import { check, fail, sleep } from 'k6';
import { SITE_URL } from './config.js';
import { ROUTES, PLACE_ROUTES, SITE_PAGES } from './routes.js';

// Every way the backend's address could leak (the same list as
// e2e/flows/hidden-backend.spec.ts).
const BACKEND_ADDRESSES = ['localhost:5000', '127.0.0.1:5000', 'api-lakat-iloilo', 'NEXT_PUBLIC_API_URL'];
// Headers the backend (NestJS, Express) would add; the proxy must drop them.
const BACKEND_HEADERS = ['X-Powered-By', 'Access-Control-Allow-Origin', 'Access-Control-Allow-Credentials', 'Etag'];

const ids = (body) => (Array.isArray(body) ? body : []).map((p) => p.id).filter(Boolean).slice(0, 20);
const pick = (list) => list[Math.floor(Math.random() * list.length)];
const namesBackend = (text) => BACKEND_ADDRESSES.some((address) => (text || '').includes(address));
const plural = (type) => (type === 'destination' ? 'destinations' : 'accommodations');

// setup() runs ONCE: real place ids, fetched the way the browser does.
export function setup() {
  const destinations = http.get(`${SITE_URL}/api/v1/destinations`, { tags: { name: 'setup' } });
  const accommodations = http.get(`${SITE_URL}/api/v1/accommodations`, { tags: { name: 'setup' } });
  if (destinations.status !== 200 || accommodations.status !== 200) {
    fail(
      `The website at ${SITE_URL} did not answer /api/v1 (destinations ${destinations.status}, ` +
        `accommodations ${accommodations.status}). Are the website (port 3000) and the backend (port 5000) running?`,
    );
  }
  const places = { destination: ids(destinations.json()), accommodation: ids(accommodations.json()) };

  // Warm-up: open each page once before the travelers start. The first visit
  // after the website starts fills its caches and took 0.85 s for home (later
  // visits 0.3 s, 2026-11-21); in a short smoke run that single visit decided
  // p(95) on its own. Tagged 'setup', so SITE_THRESHOLDS do not count it. It
  // is still a real cost: right after a deploy, the first traveler waits.
  for (const page of SITE_PAGES) {
    const id = page.placeType ? places[page.placeType][0] : null;
    if (page.placeType && !id) continue;
    http.get(`${SITE_URL}${id ? `/${plural(page.placeType)}/${id}` : page.path}`, { tags: { name: 'setup' } });
  }
  return places;
}

function buildPool(places) {
  const pool = [];
  const add = (weight, entry) => {
    for (let i = 0; i < weight; i++) pool.push(entry);
  };
  for (const page of SITE_PAGES) {
    const path = page.placeType
      ? () => {
          const id = pick(places[page.placeType]);
          return id ? `/${plural(page.placeType)}/${id}` : null;
        }
      : () => page.path;
    add(page.weight, { kind: 'page', name: page.name, path });
  }
  for (const route of ROUTES) add(route.weight, { kind: 'api', name: `API ${route.name}`, path: () => `/api${route.path}` });
  for (const route of PLACE_ROUTES) {
    const path = () => {
      const type = route.placeType === 'any' ? pick(['destination', 'accommodation']) : route.placeType;
      const id = pick(places[type]);
      if (!id) return null;
      return route.placeType === 'any'
        ? `/api/v1/reviews?place_type=${type}&place_id=${id}`
        : `/api/v1/${plural(type)}/${id}`;
    };
    add(route.weight, { kind: 'api', name: `API ${route.name}`, path });
  }
  return pool;
}

// script-src's nonce, e.g. "nonce-abc123==", or null.
function scriptNonce(policy) {
  const scriptSrc = (policy || '').split(';').map((d) => d.trim()).find((d) => d.startsWith('script-src '));
  const match = (scriptSrc || '').match(/'nonce-([^']+)'/);
  return { scriptSrc: scriptSrc || '', nonce: match ? match[1] : null };
}

// Security checks are tagged, so SITE_THRESHOLDS can demand 100 %: one
// page without the policy, or one answer naming the backend, is a fail.
const SECURITY = { security: 'yes' };

let pool;
let lastNonce = null;

export function checkPage(res) {
  const policy = res.headers['Content-Security-Policy'];
  const { scriptSrc, nonce } = scriptNonce(policy);
  const fresh = nonce !== null && nonce !== lastNonce;
  lastNonce = nonce;
  check(res, { 'page answers 200': (r) => r.status === 200 }, { kind: 'page' });
  check(res, {
    'page CSP is enforced, not report-only': () => Boolean(policy) && !res.headers['Content-Security-Policy-Report-Only'],
    'page CSP blocks framing and plugins': () => /frame-ancestors 'none'/.test(policy) && /object-src 'none'/.test(policy),
    "page scripts need a nonce, never 'unsafe-inline'": () => nonce !== null && !scriptSrc.includes("'unsafe-inline'"),
    'page nonce is new on every visit': () => fresh,
    'page HTML carries the same nonce': (r) => nonce !== null && (r.body || '').includes(`nonce="${nonce}"`),
    "page HTML never names the backend": (r) => !namesBackend(r.body),
  }, SECURITY);
}

export function checkApi(res) {
  check(res, {
    'api answers 200': (r) => r.status === 200,
    'api answers JSON': (r) => (r.headers['Content-Type'] || '').includes('application/json'),
  }, { kind: 'api' });
  check(res, {
    'api passes back no backend headers': (r) => BACKEND_HEADERS.every((h) => r.headers[h] === undefined),
    'api never names the backend': (r) => !namesBackend(r.body) && !namesBackend(JSON.stringify(r.headers)),
  }, SECURITY);
}

// One visit: a page or a data call, checked, then 1–3 s of "reading".
// Load tests pick at random by weight; the smoke test takes a TOUR, every
// page and route in turn, so one short run checks each of them at least once.
export function visit(places) {
  if (!pool) pool = buildPool(places);
  go(pick(pool));
}

let stops;
export function tour(places) {
  if (!pool) pool = buildPool(places);
  if (!stops) stops = pool.filter((entry, i) => pool.findIndex((e) => e.name === entry.name) === i);
  go(stops[exec.scenario.iterationInTest % stops.length]);
}

function go(request) {
  const path = request.path();
  if (!path) return;

  const res = http.get(`${SITE_URL}${path}`, { tags: { name: request.name, kind: request.kind } });
  if (request.kind === 'page') checkPage(res);
  else checkApi(res);

  sleep(1 + Math.random() * 2);
}
