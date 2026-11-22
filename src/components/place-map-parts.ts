import type { RouteProfile } from "@/lib/map-route";

// The parts of the place map (src/components/PlaceMap.tsx) that don't need
// React: the layers, the pins and popups, and the names of the map's own
// layers. Moved out in the code review of 2026-11-23, so PlaceMap.tsx keeps
// to the map's behaviour.

export const STYLES = {
  satellite: "mapbox://styles/mapbox/satellite-v9",
  satelliteStreets: "mapbox://styles/mapbox/satellite-streets-v12",
  streets: "mapbox://styles/mapbox/streets-v12",
} as const;
export type StyleId = keyof typeof STYLES;
export const FIRST_STYLE: StyleId = "satelliteStreets";
// Short labels on a phone, so the three buttons fit in one row at 320 px.
export const STYLE_LABELS: Record<StyleId, { short: string; full: string }> = {
  satellite: { short: "Satellite", full: "Satellite" },
  satelliteStreets: { short: "Sat + Streets", full: "Satellite Streets" },
  streets: { short: "Streets", full: "Streets" },
};

export const PIN_COLOR: Record<"main" | "you", string> = {
  // The place the traveler is going to: dark teal green (teal-800).
  main: "#115e59",
  // The traveler: blue (blue-600), the same blue as the route line.
  you: "#2563eb",
};

export const ZOOM = 15;

// The teardrop pin from the design, as a real button so it can be reached
// with the Tab key; Mapbox opens its popup on click.
export function pinElement(kind: "main" | "you", label: string) {
  const button = document.createElement("button");
  button.type = "button";
  button.setAttribute("aria-label", label);
  button.style.cssText = "padding:0;border:0;background:none;cursor:pointer;filter:drop-shadow(0 6px 10px rgba(0,0,0,.35))";
  button.innerHTML = `<svg width="44" height="55" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 1C7.7 1 1 7.6 1 15.6 1 26.8 16 39 16 39s15-12.2 15-23.4C31 7.6 24.3 1 16 1Z" fill="${PIN_COLOR[kind]}" stroke="#ffffff" stroke-width="2"/><circle cx="16" cy="15.5" r="5.5" fill="#ffffff"/></svg>`;
  return button;
}

// The popup's contents: kind, name, a line under it, and one link.
export function popupContent(kindLabel: string, title: string, sub: string, link: { label: string; href: string }) {
  const root = document.createElement("div");
  root.style.cssText = "width:230px;font-family:var(--font-inter),system-ui,sans-serif";
  const kind = document.createElement("p");
  kind.className = "font-mono-label";
  kind.style.cssText = "margin:0;font-size:10px;color:rgba(255,255,255,.8)";
  kind.textContent = kindLabel;
  const name = document.createElement("p");
  name.style.cssText = "margin:4px 28px 0 0;font-family:var(--font-fraunces),serif;font-size:20px;font-weight:500;line-height:1.15";
  name.textContent = title;
  root.append(kind, name);
  if (sub) {
    const line = document.createElement("p");
    line.style.cssText = "margin:6px 0 0;font-size:13px;line-height:1.45;color:rgba(255,255,255,.88)";
    line.textContent = sub;
    root.append(line);
  }
  const a = document.createElement("a");
  a.href = link.href;
  a.textContent = link.label;
  a.target = "_blank";
  a.rel = "noopener noreferrer";
  a.style.cssText =
    "margin-top:12px;display:flex;align-items:center;justify-content:center;height:40px;border-radius:999px;background:var(--accent);color:var(--accent-foreground);font-size:14px;font-weight:600;text-decoration:none";
  root.append(a);
  return root;
}

export const ROUTE_SOURCE = "lakat-route";
export const ROUTE_LAYERS = ["lakat-route-casing", "lakat-route-line"] as const;
export const TRAFFIC_SOURCE = "lakat-traffic";
export const TRAFFIC_LAYER = "lakat-traffic-line";

// What the route preview is doing.
export type RouteState =
  | { status: "idle" }
  | { status: "locating" | "loading"; profile: RouteProfile }
  | { status: "shown"; profile: RouteProfile; distance: number; duration: number }
  | { status: "arrived" }
  | { status: "error"; message: string };

export function supportsWebGL() {
  try {
    const canvas = document.createElement("canvas");
    return Boolean(canvas.getContext("webgl2") ?? canvas.getContext("webgl"));
  } catch {
    return false;
  }
}
