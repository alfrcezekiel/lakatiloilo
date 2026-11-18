// What one pretend traveler (a "virtual user", VU) does, shared by every
// scenario. The scenarios only change HOW MANY travelers and for HOW LONG.

import http from 'k6/http';
import { check, fail, sleep } from 'k6';
import { BASE_URL } from './config.js';
import { ROUTES, PLACE_ROUTES } from './routes.js';

const ids = (body) => {
  const list = Array.isArray(body) ? body : [];
  return list.map((place) => place.id).filter(Boolean).slice(0, 20);
};

// setup() runs ONCE before any traveler starts. It finds real place ids so
// the detail and review routes ask for places that exist.
export function setup() {
  const destinations = http.get(`${BASE_URL}/v1/destinations`, { tags: { name: 'setup' } });
  const accommodations = http.get(`${BASE_URL}/v1/accommodations`, { tags: { name: 'setup' } });
  if (destinations.status !== 200 || accommodations.status !== 200) {
    fail(
      `The backend at ${BASE_URL} did not answer (destinations ${destinations.status}, ` +
        `accommodations ${accommodations.status}). Is it running on port 5000?`,
    );
  }
  return {
    destination: ids(destinations.json()),
    accommodation: ids(accommodations.json()),
  };
}

const pick = (list) => list[Math.floor(Math.random() * list.length)];

// Build the weighted list of requests once per traveler.
function buildPool(places) {
  const pool = [];
  for (const route of ROUTES) {
    for (let i = 0; i < route.weight; i++) pool.push({ name: route.name, path: () => route.path });
  }
  for (const route of PLACE_ROUTES) {
    const path = () => {
      const type =
        route.placeType === 'any' ? pick(['destination', 'accommodation']) : route.placeType;
      const id = pick(places[type]);
      if (!id) return null;
      return route.placeType === 'any'
        ? `/v1/reviews?place_type=${type}&place_id=${id}`
        : `/v1/${type === 'destination' ? 'destinations' : 'accommodations'}/${id}`;
    };
    for (let i = 0; i < route.weight; i++) pool.push({ name: route.name, path });
  }
  return pool;
}

let pool;

// One visit: pick a route, ask for it, check the answer, then "read" the
// page for 1–3 seconds like a real person before the next visit.
export function visit(places) {
  if (!pool) pool = buildPool(places);
  const request = pick(pool);
  const path = request.path();
  if (!path) return; // no places of that type yet

  const res = http.get(`${BASE_URL}${path}`, { tags: { name: request.name } });
  check(res, {
    'answers 200': (r) => r.status === 200,
    'answers JSON': (r) => (r.headers['Content-Type'] || '').includes('application/json'),
  });

  sleep(1 + Math.random() * 2);
}
