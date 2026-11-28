import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PlaceMap } from "./PlaceMap";

// Mapbox's map code is 1.9 MB. Lighthouse 2026-11-27: on a short place page
// it loaded straight away on a phone and failed TBT and LCP. These tests
// check that the map waits for the page to finish loading, and then for the
// map itself to be on screen, with no head start.

const watched: (IntersectionObserverInit | undefined)[] = [];

beforeEach(() => {
  // A pretend token: without one the map shows its address card instead.
  vi.stubEnv("NEXT_PUBLIC_MAPBOX_TOKEN", "pk.test-token");
  watched.length = 0;
  const Pretend = globalThis.IntersectionObserver;
  vi.stubGlobal(
    "IntersectionObserver",
    class extends Pretend {
      constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
        super(callback, options);
        watched.push(options);
      }
    },
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

const showMap = () =>
  render(
    <PlaceMap tone="destination" name="Mount Talabukon" address="Igbaras, Iloilo" latitude={10.756} longitude={122.215} />,
  );

describe("loading the map", () => {
  it("does not start watching for the map until the page has finished loading", () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("loading");

    showMap();
    const beforeLoad = watched.length;
    window.dispatchEvent(new Event("load"));

    expect(beforeLoad).toBe(0);
    expect(watched).toHaveLength(1);
  });

  it("loads the map only once it is on screen, with no head start", () => {
    vi.spyOn(document, "readyState", "get").mockReturnValue("complete");

    showMap();

    expect(watched).toHaveLength(1);
    expect(watched[0]?.rootMargin).toBe("0px");
  });
});
