# 23 — v1 spatial query endpoints

**What to build:** Implement the /near endpoints for both destinations and accommodations using PostGIS spatial queries to find locations within a radius.

**Blocked by:** 21, 22

**Status:** completed

- [x] GET /v1/destinations/near endpoint implemented
- [x] GET /v1/destinations/near supports params: lat, lng, radius_km, category
- [x] GET /v1/accommodations/near endpoint implemented
- [x] GET /v1/accommodations/near supports params: lat, lng, radius_km, type
- [x] PostGIS spatial queries working correctly
- [x] Endpoints tested with real coordinates
