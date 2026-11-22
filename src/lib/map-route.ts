// Helpers for the route preview on the place map (team request 2026-11-22:
// "a preview of the interactive map from my current location to the
// place"). Kept apart from PlaceMap.tsx so they can be unit-tested without a
// browser map (map-route.test.ts).

export type RouteProfile = "driving" | "walking";

export const PROFILE_LABEL: Record<RouteProfile, string> = { driving: "Car", walking: "Walk" };

// A point as [longitude, latitude], the order Mapbox uses.
export type LngLat = [number, number];

// The address that opens directions to a place in Google Maps ("Get
// directions"): the side panel, the map's popup and the no-map card all use
// this one (code review 2026-11-23; it was written out three times).
export const googleDirectionsUrl = (latitude: number, longitude: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}`;

// The Mapbox Directions request for one route (renamed from directionsUrl in
// the code review of 2026-11-23, so it can't be mixed up with the Google
// link above). The traveler's position is
// rounded to 5 decimals (about 1 m): enough for a route, and no more
// precise than needed when it leaves the browser.
export function mapboxDirectionsRequest(profile: RouteProfile, from: LngLat, to: LngLat, token: string) {
  const point = ([lng, lat]: LngLat) => `${lng.toFixed(5)},${lat.toFixed(5)}`;
  const params = new URLSearchParams({
    geometries: "geojson",
    overview: "full",
    access_token: token,
  });
  return `https://api.mapbox.com/directions/v5/mapbox/${profile}/${point(from)};${point(to)}?${params}`;
}

// "850 m", "4.3 km", "120 km".
export function formatDistance(meters: number) {
  if (meters < 1000) return `${Math.max(10, Math.round(meters / 10) * 10)} m`;
  const km = meters / 1000;
  return `${km < 100 ? km.toFixed(1) : Math.round(km)} km`;
}

// "1 min", "12 min", "1 h 5 min", "2 h".
export function formatDuration(seconds: number) {
  const minutes = Math.max(1, Math.round(seconds / 60));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours} h ${rest} min` : `${hours} h`;
}

// What to tell the traveler when their location could not be read. The
// codes are the browser's GeolocationPositionError codes.
export function locationMessage(code: number) {
  if (code === 1) {
    return "Location is blocked for this site. Allow it in your browser's site settings and try again, or use Get directions.";
  }
  if (code === 3) return "Finding your location took too long. Please try again.";
  return "We couldn't find where you are right now. Check that location is turned on, then try again.";
}

export const NO_LOCATION_SUPPORT = "This browser can't share your location. Use Get directions instead.";
export const NO_ROUTE = "We couldn't find a route from where you are. Use Get directions instead.";
export const ROUTE_FAILED = "We couldn't load the route right now. Please try again.";

// The parts of a Directions answer the map uses.
export type DirectionsRoute = {
  distance: number;
  duration: number;
  geometry: { type: "LineString"; coordinates: LngLat[] };
};

// Reads a Directions answer. null: no route ("NoRoute", or an empty list).
export function firstRoute(body: unknown): DirectionsRoute | null {
  const routes = (body as { routes?: unknown })?.routes;
  if (!Array.isArray(routes) || routes.length === 0) return null;
  const route = routes[0] as Partial<DirectionsRoute>;
  if (
    typeof route.distance !== "number" ||
    typeof route.duration !== "number" ||
    route.geometry?.type !== "LineString" ||
    !Array.isArray(route.geometry.coordinates) ||
    route.geometry.coordinates.length < 2
  ) {
    return null;
  }
  return route as DirectionsRoute;
}

// ── Live route (ticket 159) ─────────────────────────────────────────────

// Metres between two points on the Earth (haversine). Good to a few metres
// over the distances a traveler covers in Iloilo.
export function distanceMeters([lng1, lat1]: LngLat, [lng2, lat2]: LngLat) {
  const toRad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.min(1, Math.sqrt(a)));
}

// Ask Mapbox for a new route once the traveler has moved this far…
export const REROUTE_METERS = 40;
// …but not more often than this, so one traveler sends at most 4 route
// requests a minute (Mapbox allows this token 300 a minute in total).
export const REROUTE_EVERY_MS = 15_000;
// Closer than this to the place counts as arrived, and tracking stops.
export const ARRIVED_METERS = 50;

// Should the live route be fetched again for this new position?
export function shouldReroute(lastRouted: LngLat, now: LngLat, lastFetchMs: number, nowMs: number) {
  return nowMs - lastFetchMs >= REROUTE_EVERY_MS && distanceMeters(lastRouted, now) >= REROUTE_METERS;
}

// Live traffic colours, by Mapbox's congestion level.
export const TRAFFIC_COLORS = {
  low: "#22c55e",
  moderate: "#f59e0b",
  heavy: "#f97316",
  severe: "#dc2626",
} as const;
export const TRAFFIC_LABELS: Record<keyof typeof TRAFFIC_COLORS, string> = {
  low: "Low",
  moderate: "Moderate",
  heavy: "Heavy",
  severe: "Severe",
};
