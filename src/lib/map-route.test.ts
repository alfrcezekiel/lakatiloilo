import { describe, expect, it } from "vitest";
import {
  ARRIVED_METERS,
  mapboxDirectionsRequest,
  distanceMeters,
  firstRoute,
  formatDistance,
  formatDuration,
  locationMessage,
  shouldReroute,
} from "./map-route";

describe("mapboxDirectionsRequest", () => {
  it("asks for the chosen profile from the traveler to the place, rounding their position", () => {
    const url = new URL(mapboxDirectionsRequest("walking", [122.5621234567, 10.7202987654], [122.5667, 10.6917], "pk.fake"));
    expect(url.origin).toBe("https://api.mapbox.com");
    expect(url.pathname).toBe("/directions/v5/mapbox/walking/122.56212,10.72030;122.56670,10.69170");
    expect(url.searchParams.get("geometries")).toBe("geojson");
    expect(url.searchParams.get("access_token")).toBe("pk.fake");
  });
});

describe("formatDistance", () => {
  it("uses metres under a kilometre and kilometres above", () => {
    expect(formatDistance(3)).toBe("10 m");
    expect(formatDistance(847)).toBe("850 m");
    expect(formatDistance(4321)).toBe("4.3 km");
    expect(formatDistance(152_400)).toBe("152 km");
  });
});

describe("formatDuration", () => {
  it("shows minutes, then hours and minutes", () => {
    expect(formatDuration(20)).toBe("1 min");
    expect(formatDuration(12 * 60)).toBe("12 min");
    expect(formatDuration(65 * 60)).toBe("1 h 5 min");
    expect(formatDuration(120 * 60)).toBe("2 h");
  });
});

describe("locationMessage", () => {
  it("tells the traveler what to do for each browser error", () => {
    expect(locationMessage(1)).toMatch(/blocked/);
    expect(locationMessage(2)).toMatch(/turned on/);
    expect(locationMessage(3)).toMatch(/too long/);
  });
});

describe("firstRoute", () => {
  const line = { type: "LineString", coordinates: [[122.56, 10.72], [122.57, 10.69]] };
  it("returns the first route", () => {
    expect(firstRoute({ routes: [{ distance: 4000, duration: 600, geometry: line }] })?.distance).toBe(4000);
  });
  it("returns null when Mapbox found no route or the answer is odd", () => {
    expect(firstRoute({ code: "NoRoute", routes: [] })).toBeNull();
    expect(firstRoute({ message: "Not Authorized" })).toBeNull();
    expect(firstRoute(null)).toBeNull();
    expect(firstRoute({ routes: [{ distance: 1, duration: 1, geometry: { type: "LineString", coordinates: [] } }] })).toBeNull();
  });
});

describe("distanceMeters", () => {
  it("measures about 111 m for a thousandth of a degree of latitude", () => {
    const start: [number, number] = [122.5667, 10.6917];

    const meters = distanceMeters(start, [122.5667, 10.6927]);

    expect(meters).toBeGreaterThan(110);
    expect(meters).toBeLessThan(112);
  });

  it("is zero for the same point, so standing at the place counts as arrived", () => {
    expect(distanceMeters([122.5667, 10.6917], [122.5667, 10.6917])).toBeLessThan(ARRIVED_METERS);
  });
});

describe("shouldReroute", () => {
  const routedAt: [number, number] = [122.5667, 10.6917];
  const moved100m: [number, number] = [122.5667, 10.6926];
  const moved10m: [number, number] = [122.5667, 10.6918];

  it("asks for a new route after moving far enough, once 15 seconds have passed", () => {
    expect(shouldReroute(routedAt, moved100m, 0, 15_000)).toBe(true);
  });

  it("waits when the last route is under 15 seconds old, however far the traveler moved", () => {
    expect(shouldReroute(routedAt, moved100m, 0, 14_999)).toBe(false);
  });

  it("waits when the traveler has barely moved (GPS jitter)", () => {
    expect(shouldReroute(routedAt, moved10m, 0, 60_000)).toBe(false);
  });
});
