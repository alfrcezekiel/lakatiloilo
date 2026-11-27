// Which place page Lighthouse checks (run.mjs and focus.mjs).
//
// The live sites and a local database hold different places:
//   - localhost has only the fake places from supabase/seed.sql, so a local
//     run checks Mount Talabukon from the seed (added 2026-11-27: the live
//     place's id is not in the seed, so the local place page was "not found").
//   - the live sites check a real place.
// PLACE_ID=<id> (after `--` on the npm line) picks any other place.
//
// Seed photos are placeholder links that load no real image, so a local
// place check measures the page itself, not the size of real photos.

const LIVE_PLACE_ID = "5d1155a1-6e40-417d-9c84-09a990cae00d";
const SEED_PLACE_ID = "10000000-0000-4000-8000-000000000001"; // Mount Talabukon

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isLocal(baseUrl) {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(baseUrl);
}

export function placePath(baseUrl, chosen) {
  const id = chosen?.trim() || (isLocal(baseUrl) ? SEED_PLACE_ID : LIVE_PLACE_ID);
  if (!UUID.test(id)) {
    console.error(`PLACE_ID must be a place's id, like ${SEED_PLACE_ID}. Got: ${id}`);
    process.exit(1);
  }
  return `/destinations/${id}`;
}
