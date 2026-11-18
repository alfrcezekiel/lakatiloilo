// The public GET routes a pretend traveler visits, from docs/SPEC.md
// ("API Endpoints"). Only GET routes that work without a login belong
// here: k6 never writes, never logs in and never sends a token.
//
// weight = how often a traveler hits this route compared with the others.
// A route with weight 4 is visited twice as often as one with weight 2.

export const ROUTES = [
  { name: 'GET /v1/destinations', path: '/v1/destinations', weight: 4 },
  { name: 'GET /v1/accommodations', path: '/v1/accommodations', weight: 3 },
  { name: 'GET /v1/ratings', path: '/v1/ratings', weight: 3 },
  {
    name: 'GET /v1/destinations/near',
    path: '/v1/destinations/near?lat=10.72&lng=122.56&radius_km=5', // around Iloilo City
    weight: 2,
  },
  {
    name: 'GET /v1/accommodations/near',
    path: '/v1/accommodations/near?lat=10.72&lng=122.56&radius_km=5',
    weight: 1,
  },
];

// Routes that need a real place id. The ids are UUIDs, so they are looked
// up once in setup() (see traveler.js) instead of being written here.
export const PLACE_ROUTES = [
  { name: 'GET /v1/destinations/:id', placeType: 'destination', weight: 3 },
  { name: 'GET /v1/accommodations/:id', placeType: 'accommodation', weight: 2 },
  { name: 'GET /v1/reviews?place', placeType: 'any', weight: 3 },
];
