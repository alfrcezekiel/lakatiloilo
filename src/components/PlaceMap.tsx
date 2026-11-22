"use client";

import { Maximize2, Minimize2, Navigation, Route, TrafficCone, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { Map as MapboxMap, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { pillButton } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  FIRST_STYLE,
  pinElement,
  popupContent,
  ROUTE_LAYERS,
  ROUTE_SOURCE,
  STYLE_LABELS,
  STYLES,
  supportsWebGL,
  TRAFFIC_LAYER,
  TRAFFIC_SOURCE,
  ZOOM,
  type RouteState,
  type StyleId,
} from "@/components/place-map-parts";
import {
  ARRIVED_METERS,
  googleDirectionsUrl,
  mapboxDirectionsRequest,
  distanceMeters,
  firstRoute,
  formatDistance,
  formatDuration,
  locationMessage,
  NO_LOCATION_SUPPORT,
  NO_ROUTE,
  PROFILE_LABEL,
  ROUTE_FAILED,
  shouldReroute,
  TRAFFIC_COLORS,
  TRAFFIC_LABELS,
  type DirectionsRoute,
  type LngLat,
  type RouteProfile,
} from "@/lib/map-route";

// The interactive map on the destination and accommodation pages (glass
// detail pages round, 2026-11-22; replaces "maps are out of scope for the
// MVP"). Mapbox GL, loaded only in the browser and only once the map is
// close to the screen, so the page's first load stays as light as before.
//
// Three map layers (team request 2026-11-22): Satellite (the real photo
// from above), Satellite Streets (the photo with road and place names, the
// one shown first, so the traveler sees the real place) and Streets. The
// old Dark style showed only dark shapes, not the place itself.
//
// The popup on the main pin opens without taking the keyboard focus
// (focusAfterOpen: false). Mapbox moves the focus into a popup when it
// opens, and the browser then scrolls the page to it: that was the page
// jumping to the Location section on its own (team report 2026-11-22).
//
// Satellite tiles refused (team report 2026-11-22, "429 Too Many Requests"
// on api.mapbox.com/v4/mapbox.satellite/...). Checked with curl: Mapbox
// answers every satellite tile with 429 and "x-rate-limit-limit: -1", which
// means this Mapbox account is allowed NO satellite tiles at all, not that
// the page asked too often; street tiles from the same token work. Waiting
// does not reset it; only the Mapbox account owner can (account page:
// statistics and billing, or Mapbox support). Until then, the first refused
// satellite tile switches the map to Streets, hides the two satellite
// buttons and says why, and no page asks for satellite tiles again during
// this visit (satelliteRefused), so the browser stops sending requests that
// can only fail. When the account allows satellite again, it comes back on
// its own after a reload.
//
// Live route (ticket 159, after the one-time route preview of 2026-11-22):
// "Route from my location" asks the browser for the traveler's position
// only when pressed, then keeps following it (watchPosition) while the
// route is on. Each position moves the blue "You" pin; once the traveler
// has moved about 40 m, and at most every 15 seconds (shouldReroute in
// src/lib/map-route.ts), Mapbox Directions is asked again for the road
// from there to the place, and the line, time and distance update. Within
// about 50 m of the place it says "You've arrived" and stops. ✕, leaving
// the page, or the map being rebuilt stop it too (clearWatch). The
// position goes to Mapbox only: never to our backend, never saved. The
// place's position is its latitude and longitude from the destinations or
// accommodations table (passed in by the page).
//
// Live traffic (ticket 159): the Traffic button adds Mapbox's live
// congestion lines (mapbox-traffic-v1), coloured green / amber / orange /
// red. Traffic and the route are style layers, so both are drawn again
// after every layer switch ("style.load"), the route on top.
//
// Enlarge (ticket 160): on tablets and phones (below 1024 px) the map can
// fill the whole screen. It is the same map element, made "fixed" over the
// page, so the route, traffic and layer carry over. In the page a phone
// needs two fingers to move the map (one finger scrolls the page); enlarged,
// one finger moves it (setCooperativeGestures). It acts like a dialog: the
// page behind stops scrolling, Tab stays inside, Escape or the button
// closes it, and the focus returns to where it was.
//
// Pin colours (ticket 159): the place is dark teal green, the traveler
// blue.
//
// "net::ERR_BLOCKED_BY_CLIENT" on events.mapbox.com in the console is an ad
// blocker stopping Mapbox's usage counter. The map does not need it.
//
// Pins are HTML markers, not style layers: they survive setStyle(), so
// switching layers never needs them added again, and
// they stay clear of the setSprite diffing quirk. Popups are built with
// textContent, never HTML, because place names come from the dashboard.
// Without NEXT_PUBLIC_MAPBOX_TOKEN, or without WebGL, the page shows a
// small glass card with the address and Get directions instead.

type Tone = "destination" | "accommodation";
// "Nearby places" pins and filters were removed in the code review of
// 2026-11-22: no page passed any, and the SPEC parks the feature ("Nearby
// places" using the /near endpoints, docs/LATER.md). Add them back with
// that ticket.

// True once Mapbox refused a satellite tile during this visit (see above).
let satelliteRefused = false;

export function PlaceMap({
  tone,
  name,
  address,
  latitude,
  longitude,
}: {
  tone: Tone;
  name: string;
  address: string;
  latitude: number;
  longitude: number;
}) {
  const frame = useRef<HTMLDivElement>(null);
  const box = useRef<HTMLDivElement>(null);
  const map = useRef<MapboxMap | null>(null);
  const [near, setNear] = useState(false);
  const [failed, setFailed] = useState(false);
  const [style, setStyle] = useState<StyleId>(() => (satelliteRefused ? "streets" : FIRST_STYLE));
  const [satelliteOff, setSatelliteOff] = useState(() => satelliteRefused);
  // The layer shown now, read when the map is built and by its error
  // handler. A ref, kept in step by pickStyle, so switching layers never
  // rebuilds the map.
  const styleRef = useRef(style);
  const [ready, setReady] = useState(false);
  const [route, setRoute] = useState<RouteState>({ status: "idle" });
  // The route line and the traveler's position, kept for redrawing after a
  // layer switch and for switching between Car and Walk without asking for
  // the location again.
  const routeLine = useRef<DirectionsRoute["geometry"] | null>(null);
  const from = useRef<LngLat | null>(null);
  const youMarker = useRef<Marker | null>(null);
  const mainMarker = useRef<Marker | null>(null);
  const gl = useRef<typeof import("mapbox-gl").default | null>(null);
  const request = useRef<AbortController | null>(null);
  // Live tracking: the browser's watch id, where and when the route was
  // last fetched, and the travel mode the watch uses.
  const watchId = useRef<number | null>(null);
  const lastRouted = useRef<LngLat | null>(null);
  const lastFetch = useRef(0);
  const profileRef = useRef<RouteProfile>("driving");
  const [traffic, setTraffic] = useState(false);
  const trafficRef = useRef(false);
  // True between Mapbox's "style.load" and the next layer switch: the
  // moments our own layers (traffic, route) may be added. Not
  // map.isStyleLoaded(): that also waits for every tile to arrive, so
  // while the map moved (zooming to the route, a traveler on the move) it
  // said "no" and the traffic and route updates were skipped.
  const styleReady = useRef(false);
  // The control groups at the top and bottom of the map, measured so the
  // route is zoomed to fit in the clear space between them.
  const topControls = useRef<HTMLDivElement>(null);
  const bottomControls = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  // The button that opened the enlarged map gets the focus back.
  const opener = useRef<HTMLElement | null>(null);
  const toggleButton = useRef<HTMLButtonElement>(null);
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  // Both kinds of page are teal (ticket 161).
  const panel = "bg-teal-950/60";

  // Wait until the map is close to the screen before loading Mapbox.
  useEffect(() => {
    const element = frame.current;
    if (!element || near || failed) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        // No WebGL (an old phone, or graphics switched off): the fallback
        // card instead of an empty box. Checked here, in the observer's
        // callback, so no state is set straight inside an effect.
        if (supportsWebGL()) setNear(true);
        else setFailed(true);
      },
      { rootMargin: "400px 0px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [near, failed]);

  useEffect(() => {
    if (!near || !token || !box.current) return;
    let cancelled = false;
    (async () => {
      try {
        const mapboxgl = (await import("mapbox-gl")).default;
        if (cancelled || !box.current) return;
        mapboxgl.accessToken = token;
        gl.current = mapboxgl;
        const m = new mapboxgl.Map({
          container: box.current,
          style: STYLES[styleRef.current],
          center: [longitude, latitude],
          zoom: ZOOM,
          // The page keeps scrolling over the map; Ctrl/⌘ + scroll (or two
          // fingers on a phone) moves the map.
          cooperativeGestures: true,
          attributionControl: false,
        });
        m.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
        m.addControl(new mapboxgl.ScaleControl({ unit: "metric" }), "bottom-right");
        m.addControl(new mapboxgl.AttributionControl({ compact: true }), "bottom-right");
        // A missing tile is not worth a console flood. But a refused token
        // (401/403: wrong token, or this website's address is not on the
        // token's allowed URLs in the Mapbox account) means no map at all:
        // show the address card with Get directions instead of an empty box.
        m.on("error", (event) => {
          if (cancelled) return;
          // Mapbox adds the HTTP status and address to a refused request.
          const { status, url = "" } = event.error as Error & { status?: number; url?: string };
          const refused = status === 401 || status === 403 || status === 429;
          if (refused && url.includes("mapbox.satellite")) {
            if (satelliteRefused && styleRef.current === "streets") return;
            satelliteRefused = true;
            styleRef.current = "streets";
            setSatelliteOff(true);
            setStyle("streets");
            styleReady.current = false;
            m.setStyle(STYLES.streets, { diff: false } as Parameters<MapboxMap["setStyle"]>[1]);
            return;
          }
          if (status === 401 || status === 403) setFailed(true);
        });

        const main = new mapboxgl.Marker({ element: pinElement("main", name), anchor: "bottom" })
          .setLngLat([longitude, latitude])
          .setPopup(
            new mapboxgl.Popup({
              offset: 52,
              maxWidth: "280px",
              focusAfterOpen: false,
              // Always above the pin. Left to choose, Mapbox flipped a tall
              // popup (an accommodation's two-line name) below the pin on a
              // phone, over the layer buttons and past the map's edge; the
              // effect that clears the top panel then makes room above.
              anchor: "bottom",
            }).setDOMContent(
              popupContent(tone === "destination" ? "This destination" : "Your stay", name, address, {
                label: "Get directions",
                href: googleDirectionsUrl(latitude, longitude),
              }),
            ),
          )
          .addTo(m);
        mainMarker.current = main;
        m.once("load", () => {
          if (!main.getPopup()?.isOpen()) main.togglePopup();
          if (!cancelled) setReady(true);
        });
        // A layer switch loads a new style, which drops the route line:
        // draw it again on the new one.
        m.on("style.load", () => {
          styleReady.current = true;
          drawTraffic(m);
          drawRoute(m);
        });

        map.current = m;
      } catch {
        if (!cancelled) setFailed(true);
      }
    })();
    return () => {
      cancelled = true;
      if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
      lastRouted.current = null;
      request.current?.abort();
      routeLine.current = null;
      youMarker.current = null;
      mainMarker.current = null;
      styleReady.current = false;
      map.current?.remove();
      map.current = null;
    };
  }, [near, token, latitude, longitude, name, address, tone]);

  // Enlarged map: one-finger moves, no page scroll behind it, Escape and
  // Tab handled, the map redrawn at its new size, focus in and back out.
  useEffect(() => {
    const m = map.current;
    if (m && m.getCooperativeGestures() === expanded) {
      // setCooperativeGestures only changes a setting: Mapbox sets the
      // touch classes (touch-action: pan-x pan-y, which hands one-finger
      // drags to the browser) and the "Use two fingers" layer when its
      // drag handler is switched on. Switching it off and on again redoes
      // them for the new mode; without this a real phone kept treating a
      // one-finger drag on the enlarged map as a page scroll.
      m.dragPan.disable();
      m.setCooperativeGestures(!expanded);
      m.dragPan.enable();
    }
    // The frame changed size: Mapbox redraws for it on the next frame.
    const frameId = requestAnimationFrame(() => map.current?.resize());
    if (!expanded) return () => cancelAnimationFrame(frameId);
    const root = document.documentElement;
    const before = root.style.overflow;
    root.style.overflow = "hidden";
    toggleButton.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setExpanded(false);
        return;
      }
      if (event.key !== "Tab" || !frame.current) return;
      // Keep Tab inside the enlarged map, like any dialog.
      const items = [
        ...frame.current.querySelectorAll<HTMLElement>("button, a[href], [tabindex]:not([tabindex='-1'])"),
      ].filter((el) => el.offsetParent !== null && !el.hasAttribute("disabled"));
      if (items.length === 0) return;
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => {
      cancelAnimationFrame(frameId);
      root.style.overflow = before;
      document.removeEventListener("keydown", onKey);
      opener.current?.focus({ preventScroll: true });
    };
  }, [expanded]);

  function openLarge(from: HTMLElement) {
    opener.current = from;
    setExpanded(true);
  }

  // The place's popup opens when the map loads, centred over the pin. On a
  // phone it ran under the "Route from my location" panel, which hid its
  // top and its ✕ (team report 2026-11-22). Once that panel is on screen
  // (ready), measure both; if they overlap, slide the map down by exactly
  // the overlap. On a laptop they sit side by side and nothing moves.
  useEffect(() => {
    if (!ready) return;
    const frameId = requestAnimationFrame(() => {
      const m = map.current;
      const popup = mainMarker.current?.getPopup();
      const panel = topControls.current?.getBoundingClientRect();
      if (!m || !popup?.isOpen() || !panel || panel.height === 0) return;
      const box = popup.getElement()?.getBoundingClientRect();
      if (!box) return;
      const sideBySide = box.right <= panel.left || box.left >= panel.right;
      const overlap = panel.bottom + 12 - box.top;
      // panBy with a negative y moves the map's content down.
      if (!sideBySide && overlap > 0) m.panBy([0, -overlap], { duration: 0 });
    });
    return () => cancelAnimationFrame(frameId);
  }, [ready]);

  // Live traffic lines, under the route line so the route stays on top.
  function drawTraffic(m: MapboxMap) {
    if (!trafficRef.current || !styleReady.current || m.getLayer(TRAFFIC_LAYER)) return;
    if (!m.getSource(TRAFFIC_SOURCE)) m.addSource(TRAFFIC_SOURCE, { type: "vector", url: "mapbox://mapbox.mapbox-traffic-v1" });
    m.addLayer(
      {
        id: TRAFFIC_LAYER,
        type: "line",
        source: TRAFFIC_SOURCE,
        "source-layer": "traffic",
        layout: { "line-join": "round", "line-cap": "round" },
        paint: {
          "line-color": [
            "match",
            ["get", "congestion"],
            "low",
            TRAFFIC_COLORS.low,
            "moderate",
            TRAFFIC_COLORS.moderate,
            "heavy",
            TRAFFIC_COLORS.heavy,
            "severe",
            TRAFFIC_COLORS.severe,
            "#94a3b8",
          ],
          "line-width": ["interpolate", ["linear"], ["zoom"], 10, 1.5, 14, 3, 17, 6],
        },
      },
      m.getLayer(ROUTE_LAYERS[0]) ? ROUTE_LAYERS[0] : undefined,
    );
  }

  function toggleTraffic() {
    const on = !trafficRef.current;
    trafficRef.current = on;
    setTraffic(on);
    const m = map.current;
    if (!m) return;
    if (on) drawTraffic(m);
    else {
      if (m.getLayer(TRAFFIC_LAYER)) m.removeLayer(TRAFFIC_LAYER);
      if (m.getSource(TRAFFIC_SOURCE)) m.removeSource(TRAFFIC_SOURCE);
    }
  }

  // Draws (or redraws) the route line: a dark casing under a bright line,
  // so it stands out on streets and on satellite photos alike.
  function drawRoute(m: MapboxMap) {
    const line = routeLine.current;
    if (!line || !styleReady.current) return;
    const data = { type: "Feature" as const, properties: {}, geometry: line };
    const source = m.getSource(ROUTE_SOURCE);
    if (source && "setData" in source) {
      source.setData(data);
      return;
    }
    m.addSource(ROUTE_SOURCE, { type: "geojson", data });
    const join = { "line-join": "round" as const, "line-cap": "round" as const };
    m.addLayer({ id: ROUTE_LAYERS[0], type: "line", source: ROUTE_SOURCE, layout: join, paint: { "line-color": "#1e3a8a", "line-width": 9, "line-opacity": 0.55 } });
    m.addLayer({ id: ROUTE_LAYERS[1], type: "line", source: ROUTE_SOURCE, layout: join, paint: { "line-color": "#3b82f6", "line-width": 5 } });
  }

  // The browser stops reading the traveler's location.
  function stopWatching() {
    if (watchId.current !== null) navigator.geolocation.clearWatch(watchId.current);
    watchId.current = null;
  }

  function clearRoute() {
    stopWatching();
    lastRouted.current = null;
    request.current?.abort();
    const m = map.current;
    if (m) {
      ROUTE_LAYERS.forEach((id) => m.getLayer(id) && m.removeLayer(id));
      if (m.getSource(ROUTE_SOURCE)) m.removeSource(ROUTE_SOURCE);
    }
    youMarker.current?.remove();
    youMarker.current = null;
    routeLine.current = null;
    setRoute({ status: "idle" });
  }

  // Puts the blue "You" pin at the traveler's position (or moves it).
  function placeYou(m: MapboxMap, at: LngLat) {
    if (youMarker.current) youMarker.current.setLngLat(at);
    else if (gl.current) {
      youMarker.current = new gl.current.Marker({ element: pinElement("you", "Your location"), anchor: "bottom" })
        .setLngLat(at)
        .addTo(m);
    }
  }

  // Asks Mapbox for the road from `start` to the place and shows it.
  // fit: zoom to the whole route (the first route, or Car / Walk); a live
  // update keeps the traveler's own zoom and only follows them if they
  // leave the screen.
  async function loadRoute(profile: RouteProfile, start: LngLat, fit: boolean) {
    const m = map.current;
    if (!m || !token) return;
    request.current?.abort();
    const controller = new AbortController();
    request.current = controller;
    lastRouted.current = start;
    lastFetch.current = Date.now();
    if (fit) setRoute({ status: "loading", profile });
    try {
      const response = await fetch(mapboxDirectionsRequest(profile, start, [longitude, latitude], token), {
        signal: controller.signal,
      });
      const found = firstRoute(await response.json().catch(() => null));
      if (controller.signal.aborted) return;
      if (!found) {
        // A live update that fails keeps the last route on screen.
        if (!fit) return;
        stopWatching();
        setRoute({ status: "error", message: response.ok ? NO_ROUTE : ROUTE_FAILED });
        return;
      }
      routeLine.current = found.geometry;
      drawRoute(m);
      placeYou(m, start);
      const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
      if (fit) {
        // The place's popup would cover the route; its pin stays.
        if (mainMarker.current?.getPopup()?.isOpen()) mainMarker.current.togglePopup();
        // Zoom to show the whole route in the clear space between the
        // controls at the top and the bottom of the map (their height
        // changes: the Traffic legend, two-line notes on a phone), so
        // neither pin ends up under a panel.
        const bounds = found.geometry.coordinates.reduce(
          (box, point) => box.extend(point),
          new (gl.current!.LngLatBounds)(start, start),
        );
        const area = frame.current!.getBoundingClientRect();
        const room = Math.max(0, area.height - 100) / 2;
        const top = Math.min(room, (topControls.current?.getBoundingClientRect().bottom ?? area.top + 96) - area.top + 60);
        const bottom = Math.min(room, area.bottom - (bottomControls.current?.getBoundingClientRect().top ?? area.bottom - 70) + 16);
        m.fitBounds(bounds, { padding: { top, bottom, left: 50, right: 70 }, maxZoom: 16, duration: reduce ? 0 : 1200 });
      } else if (!m.getBounds()?.contains(start)) {
        m.easeTo({ center: start, duration: reduce ? 0 : 800 });
      }
      setRoute({ status: "shown", profile, distance: found.distance, duration: found.duration });
    } catch {
      if (!controller.signal.aborted && fit) {
        stopWatching();
        setRoute({ status: "error", message: ROUTE_FAILED });
      }
    }
  }

  // Each new position from the browser while the route is on.
  function onPosition(position: GeolocationPosition) {
    const m = map.current;
    if (!m) return;
    const here: LngLat = [position.coords.longitude, position.coords.latitude];
    from.current = here;
    if (distanceMeters(here, [longitude, latitude]) <= ARRIVED_METERS) {
      stopWatching();
      request.current?.abort();
      placeYou(m, here);
      setRoute({ status: "arrived" });
      return;
    }
    if (!lastRouted.current) {
      void loadRoute(profileRef.current, here, true);
      return;
    }
    placeYou(m, here);
    if (shouldReroute(lastRouted.current, here, lastFetch.current, Date.now())) {
      void loadRoute(profileRef.current, here, false);
    }
  }

  // "Route from my location": the browser asks the traveler first, then
  // keeps sending their position until the route is cleared.
  function startRoute(profile: RouteProfile) {
    if (!("geolocation" in navigator)) {
      setRoute({ status: "error", message: NO_LOCATION_SUPPORT });
      return;
    }
    stopWatching();
    profileRef.current = profile;
    lastRouted.current = null;
    setRoute({ status: "locating", profile });
    watchId.current = navigator.geolocation.watchPosition(
      onPosition,
      (error) => {
        // Once the route is on, a slow or lost GPS fix keeps the last
        // route; only a refusal (or no first fix) stops and explains.
        if (lastRouted.current && error.code !== 1) return;
        stopWatching();
        setRoute({ status: "error", message: locationMessage(error.code) });
      },
      { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 },
    );
  }

  // Car / Walk while the route is on: same position, new route, and the
  // live updates use the new mode from now on.
  function switchProfile(profile: RouteProfile) {
    profileRef.current = profile;
    if (from.current && watchId.current !== null) void loadRoute(profile, from.current, true);
    else startRoute(profile);
  }

  const pickStyle = (id: StyleId) => {
    styleRef.current = id;
    setStyle(id);
    if (map.current) styleReady.current = false;
    // diff: false loads the new style whole instead of patching the old one
    // (the setSprite diffing quirk). Mapbox's types mark its two font
    // options as required although Mapbox treats them as optional, hence
    // the cast to its own parameter type.
    map.current?.setStyle(STYLES[id], { diff: false } as Parameters<MapboxMap["setStyle"]>[1]);
  };

  const recenter = () => {
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const target = { center: [longitude, latitude] as [number, number], zoom: ZOOM };
    if (reduce) map.current?.jumpTo(target);
    else map.current?.flyTo({ ...target, essential: true });
  };

  if (!token || failed) {
    return (
      <div className="glass rounded-3xl border border-white/20 bg-white/10 p-6 text-white">
        <p className="font-mono-label text-[11px] text-white/80">Location</p>
        <p className="mt-1.5 text-[15px] font-medium">{address}</p>
        <p className="mt-1 [font-family:var(--font-plex-mono)] text-sm text-white/85">
          {latitude}° N, {longitude}° E
        </p>
        <a
          href={googleDirectionsUrl(latitude, longitude)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(pillButton({ kind: "main" }), "mt-4")}
        >
          <Navigation aria-hidden="true" />
          Get directions
          <span className="sr-only"> (opens in a new tab)</span>
        </a>
      </div>
    );
  }

  const busy = route.status === "locating" || route.status === "loading";
  const chosen = route.status === "shown" || busy ? route.profile : "driving";
  const pill =
    "inline-flex h-11 cursor-pointer items-center justify-center gap-2 rounded-full px-4 text-[13px] font-semibold whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white disabled:cursor-wait disabled:opacity-80";

  return (
    <div>
    {/* The map's place in the page keeps its height while the map is
        enlarged, so the page under it never moves and closing returns to
        the same spot (without it the page shifted up by the map's height
        and the browser moved the scroll position to follow). */}
    <div className="relative h-120 sm:h-136">
    <div
      ref={frame}
      {...(expanded ? { role: "dialog", "aria-modal": true, "aria-label": `Map of ${name}, full screen` } : {})}
      className={cn(
        "overflow-hidden bg-slate-900",
        // h-dvh: the real visible height on a phone, under the browser bars.
        expanded
          ? "fixed inset-0 z-70 h-dvh w-full"
          : "absolute inset-0 rounded-3xl border border-white/25 shadow-2xl",
      )}
    >
      {/* size-full, not "absolute inset-0": Mapbox's own stylesheet sets
          its map box to position: relative, which beats our classes, and the
          box then had no height at all, so the map drew nothing (team report
          2026-11-22, "the map still shows nothing"). */}
      <div ref={box} className="size-full" role="region" aria-label={`Map of ${name}`} />

      {/* Top-left: the route preview. On a phone it stops short of the
          zoom buttons on the right. */}
      <div
        ref={topControls}
        className="absolute top-3.5 right-16 left-3.5 flex flex-col items-start gap-2 sm:right-auto sm:max-w-sm"
      >
      {ready && (
        <div className={cn("glass w-full rounded-3xl border border-white/25 p-1.5 text-white", panel)}>
          {route.status === "arrived" ? (
            <div className="flex items-center gap-1">
              <p role="status" className="flex-1 px-3 py-2 text-[13px] font-semibold">
                You&apos;ve arrived at {name}.
              </p>
              <button
                type="button"
                onClick={clearRoute}
                aria-label="Clear the route"
                className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                <X aria-hidden="true" className="size-4.5" />
              </button>
            </div>
          ) : route.status === "shown" || busy ? (
            <>
              <div className="flex items-center gap-1">
                <div role="group" aria-label="Travel by" className="grid flex-1 grid-cols-2 gap-1">
                  {(Object.keys(PROFILE_LABEL) as RouteProfile[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={chosen === p}
                      disabled={busy}
                      onClick={() => switchProfile(p)}
                      className={cn(pill, chosen === p ? "bg-white text-slate-900" : "text-white/80 hover:text-white")}
                    >
                      {PROFILE_LABEL[p]}
                    </button>
                  ))}
                </div>
                <button
                  type="button"
                  onClick={clearRoute}
                  aria-label="Stop and clear the route"
                  className="inline-flex size-11 shrink-0 cursor-pointer items-center justify-center rounded-full text-white/80 transition-colors hover:text-amber-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
                >
                  <X aria-hidden="true" className="size-4.5" />
                </button>
              </div>
              {/* The numbers change every few seconds while live, so they
                  are not a live region (a screen reader would repeat them);
                  the sr-only status below only announces each new stage. */}
              <p className="flex items-center gap-2 px-3 pt-1.5 pb-2 text-[13px]">
                {route.status === "shown" ? (
                  <>
                    <span className="inline-flex items-center gap-1.5 font-semibold text-green-300">
                      <span aria-hidden="true" className="size-2 rounded-full bg-green-400 motion-safe:animate-pulse" />
                      Live
                    </span>
                    <span>
                      <span className="font-semibold">{formatDuration(route.duration)}</span>
                      {" · "}
                      {formatDistance(route.distance)}
                      {route.profile === "driving" ? " by car" : " on foot"}
                    </span>
                  </>
                ) : route.status === "locating" ? (
                  "Finding your location…"
                ) : (
                  "Finding the route…"
                )}
              </p>
              <p role="status" className="sr-only">
                {route.status === "shown"
                  ? `Live route shown, ${route.profile === "driving" ? "by car" : "on foot"}. It follows you as you move.`
                  : route.status === "locating"
                    ? "Finding your location"
                    : "Finding the route"}
              </p>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => startRoute("driving")}
                aria-describedby="route-privacy"
                className={cn(pill, "w-full bg-white text-slate-900 hover:bg-white/90")}
              >
                <Route aria-hidden="true" className="size-4" />
                Route from my location
              </button>
              {route.status === "error" && (
                <p role="status" className="px-3 pt-2 pb-1.5 text-[13px] leading-snug">
                  {route.message}
                </p>
              )}
            </>
          )}
        </div>
      )}

      </div>

      {/* Bottom-left: the layer buttons, or why satellite is missing. */}
      <div
        ref={bottomControls}
        className="absolute right-3.5 bottom-10 left-3.5 flex flex-col gap-2 sm:right-auto sm:bottom-3.5"
      >
          {traffic && (
            <ul
              aria-label="Traffic colours"
              className={cn(
                "glass flex w-fit flex-wrap gap-x-3 gap-y-1 rounded-full border border-white/25 px-3.5 py-2 text-[11px] text-white",
                panel,
              )}
            >
              {(Object.keys(TRAFFIC_COLORS) as (keyof typeof TRAFFIC_COLORS)[]).map((level) => (
                <li key={level} className="inline-flex items-center gap-1.5">
                  <span aria-hidden="true" className="h-1 w-3.5 rounded-full" style={{ background: TRAFFIC_COLORS[level] }} />
                  {TRAFFIC_LABELS[level]}
                </li>
              ))}
            </ul>
          )}
      {satelliteOff ? (
        <p
          role="status"
          className={cn(
            "glass rounded-2xl border border-white/25 px-3.5 py-2.5 text-[13px] text-white sm:max-w-sm",
            panel,
          )}
        >
          Satellite view isn&apos;t available right now, so the map shows streets.
        </p>
      ) : (
        <div
          role="group"
          aria-label="Map style"
          className={cn(
            "glass grid grid-cols-3 gap-1 rounded-full border border-white/25 p-1 sm:flex",
            panel,
          )}
        >
          {(Object.keys(STYLES) as StyleId[]).map((id) => (
            <button
              key={id}
              type="button"
              aria-pressed={style === id}
              onClick={() => pickStyle(id)}
              className={cn(
                "h-11 min-w-0 cursor-pointer rounded-full px-2 text-[13px] font-semibold whitespace-nowrap transition-colors select-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white sm:px-4",
                style === id ? "bg-white text-slate-900" : "text-white/80 hover:text-white",
              )}
            >
              <span className="sm:hidden">{STYLE_LABELS[id].short}</span>
              <span className="hidden sm:inline">{STYLE_LABELS[id].full}</span>
            </button>
          ))}
        </div>
      )}
      </div>

      {/* Live traffic on / off, under the recenter button. */}
      {ready && (
        <button
          type="button"
          aria-pressed={traffic}
          aria-label="Live traffic"
          title="Live traffic"
          onClick={toggleTraffic}
          className={cn(
            "glass absolute top-[172px] right-2.5 inline-flex size-11 cursor-pointer items-center justify-center rounded-2xl border border-white/25 transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
            traffic ? "bg-white text-slate-900" : cn("text-white", panel),
          )}
        >
          <TrafficCone aria-hidden="true" className="size-4.5" />
        </button>
      )}

      <button
        type="button"
        onClick={recenter}
        className={cn(
          "glass absolute top-[118px] right-2.5 inline-flex size-11 cursor-pointer items-center justify-center rounded-2xl border border-white/25 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          panel,
        )}
        aria-label={`Recenter on ${name}`}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
          <circle cx="12" cy="12" r="7" />
          <circle cx="12" cy="12" r="2" />
          <path d="M12 2v3M12 19v3M2 12h3M19 12h3" />
        </svg>
      </button>

      {/* Enlarge / make smaller (tablets and phones; stays while enlarged). */}
      <button
        ref={toggleButton}
        type="button"
        onClick={(event) => (expanded ? setExpanded(false) : openLarge(event.currentTarget))}
        aria-label={expanded ? "Make the map smaller" : "Enlarge map"}
        title={expanded ? "Make the map smaller" : "Enlarge map"}
        className={cn(
          "glass absolute top-[226px] right-2.5 inline-flex size-11 cursor-pointer items-center justify-center rounded-2xl border border-white/25 text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white",
          expanded ? "bg-white text-slate-900" : cn(panel, "lg:hidden"),
        )}
      >
        {expanded ? <Minimize2 aria-hidden="true" className="size-4.5" /> : <Maximize2 aria-hidden="true" className="size-4.5" />}
      </button>
    </div>
    </div>
    {/* The easy-to-find way in on tablets and phones. */}
    <button
      type="button"
      onClick={(event) => openLarge(event.currentTarget)}
      className={cn(pillButton({ kind: "glass" }), "mt-3 w-full lg:hidden")}
    >
      <Maximize2 aria-hidden="true" />
      Enlarge map
    </button>
    <p id="route-privacy" className="mt-2.5 px-1 text-xs leading-relaxed text-white/75">
      Route from my location follows your location while the route is on and shares it only with Mapbox, to
      find the way. It stops when you press ✕ or leave this page. Lakat Iloilo doesn&apos;t save it.
    </p>
    </div>
  );
}
