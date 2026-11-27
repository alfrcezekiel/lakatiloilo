// Lighthouse deep-dive: print the detailed findings of chosen audits —
// which images are bigger than they need to be, which third parties set
// cookies, and so on. run.mjs gives the scores; this shows the evidence.
//
//   npm run perf:lighthouse:focus
//
// Same settings as run.mjs (BASE_URL, DEVICES, PAGES, PLACE_ID), plus:
//   AUDITS   comma-separated audit ids (default below). List what a run
//            produced with: grep -o '"[a-z-]*": {' report.html is not
//            reliable — check lhr.audits keys, or docs/TESTING.md.
// Defaults check the live site, phone only, on home and one place page —
// the two pages where the photo and cookie findings appeared.
//
// Writes reports/<page>-<device>.audits.json (git-ignored) with the raw
// audit details. Exit code 1 while any chosen audit still fails, 0 when
// they all pass — handy for checking a fix.
//
// Read-only: it opens pages like a visitor, nothing else.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { placePath } from "./place.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.includes("=")).map((a) => a.split(/=(.*)/s).slice(0, 2)),
);
const BASE_URL = (args.BASE_URL ?? process.env.BASE_URL ?? "https://lakat-iloilo.vercel.app").replace(/\/+$/, "");
const DEVICES = (args.DEVICES ?? process.env.DEVICES ?? "mobile").split(",").map((d) => d.trim());

const ALL_PAGES = [
  { name: "home", path: "/" },
  { name: "place", path: placePath(BASE_URL, args.PLACE_ID ?? process.env.PLACE_ID) },
];
const only = (args.PAGES ?? process.env.PAGES ?? "").split(",").map((p) => p.trim()).filter(Boolean);
const PAGES = only.length ? ALL_PAGES.filter((p) => only.includes(p.name)) : ALL_PAGES;

// The audits behind the 2026-11-18 report's open findings. Lighthouse 13
// folded the old image audits into insights:
// - image-delivery-insight replaces uses-optimized-images,
//   uses-responsive-images, modern-image-formats and offscreen-images —
//   it lists each image with wastedBytes and the reason (too big,
//   wrong format, offscreen, ...).
// - third-parties-insight replaces third-party-summary; third-party-cookies
//   still names the cookies (WMF-Uniq, NetworkProbeLimit from Wikimedia).
// - network-requests and total-byte-weight show every image's real size,
//   so the savings can be checked by hand.
const DEFAULT_AUDITS = [
  "image-delivery-insight",
  "total-byte-weight",
  "network-requests",
  "third-party-cookies",
  "third-parties-insight",
];
const AUDITS = (args.AUDITS ?? process.env.AUDITS ?? DEFAULT_AUDITS.join(","))
  .split(",")
  .map((a) => a.trim())
  .filter(Boolean);

const here = dirname(fileURLToPath(import.meta.url));
const reportDir = join(here, "reports");
mkdirSync(reportDir, { recursive: true });

// "key=value" pairs for one sub-item of an insight table (a reason plus
// wastedBytes for images, a url plus sizes for third parties).
function compactPairs(item) {
  const parts = [];
  for (const [key, value] of Object.entries(item)) {
    if (value === null || value === undefined || typeof value === "object") continue;
    const text = String(value);
    parts.push(`${key}=${text.length > 80 ? `${text.slice(0, 77)}...` : text}`);
  }
  return parts.join(" ");
}

// One item of an audit's details table, as "key=value" pairs. Nested
// objects (like `entity`) are flattened to their text/url, and
// `subItems` (insight tables) are summarised inline.
function itemLine(item) {
  const parts = [];
  for (const [key, value] of Object.entries(item)) {
    if (value === null || value === undefined) continue;
    if (key === "subItems" && Array.isArray(value.items)) {
      const subs = value.items.slice(0, 5).map(compactPairs);
      const more = value.items.length > 5 ? ` +${value.items.length - 5} more` : "";
      parts.push(`subItems=[${subs.join(" | ")}${more}]`);
      continue;
    }
    if (typeof value === "object") {
      if (key === "entity" && (value.text || value.url)) {
        parts.push(`entity=${value.text ?? ""} ${value.url ?? ""}`.trim());
      } else if (!Array.isArray(value)) {
        // e.g. metricSavings: {FCP: 300, ...} -> one summary per key
        for (const [k, v] of Object.entries(value)) {
          if (typeof v === "number") parts.push(`${key}.${k}=${v}`);
        }
      }
      continue;
    }
    const text = String(value);
    parts.push(`${key}=${text.length > 160 ? `${text.slice(0, 157)}...` : text}`);
  }
  return parts.join("  ").slice(0, 500);
}

// network-requests lists every file the page fetched; the photo question
// is about images, so show only those, biggest first.
function itemsFor(auditId, audit) {
  const items = audit.details?.items ?? [];
  if (auditId === "network-requests") {
    return items
      .filter((i) => i.resourceType === "Image")
      .sort((a, b) => (b.transferSize ?? 0) - (a.transferSize ?? 0))
      .slice(0, 15);
  }
  return items.slice(0, 30);
}

const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-first-run"] });
let failures = 0;
const knownAudits = new Set();
try {
  for (const device of DEVICES) {
    for (const page of PAGES) {
      const url = `${BASE_URL}${page.path}`;
      const config = device === "desktop" ? desktopConfig : undefined;
      const result = await lighthouse(
        url,
        {
          port: chrome.port,
          output: "html",
          logLevel: "error",
          onlyCategories: ["performance", "best-practices"],
        },
        config,
      );
      const lhr = result.lhr;
      for (const id of Object.keys(lhr.audits)) knownAudits.add(id);

      const picked = {};
      console.log(`\n== ${page.name} (${page.path}) · ${device}`);
      for (const id of AUDITS) {
        const audit = lhr.audits[id];
        if (!audit) {
          console.log(`   ? ${id}: not in this run (check the audit id)`);
          continue;
        }
        picked[id] = audit;
        const state = audit.score === 1 ? "PASS" : audit.score === null || audit.score === undefined ? "n/a" : "FAIL";
        if (state === "FAIL") failures++;
        console.log(`   ${state === "PASS" ? "✓" : state === "FAIL" ? "✗" : "·"} ${audit.title}  score=${audit.score ?? "n/a"}${audit.displayValue ? `  ${audit.displayValue}` : ""}`);
        const items = itemsFor(id, audit);
        for (const item of items) console.log(`        ${itemLine(item)}`);
        if ((audit.details?.items?.length ?? 0) > items.length) {
          console.log(`        … and ${audit.details.items.length - items.length} more (see the .audits.json file)`);
        }
      }
      writeFileSync(
        join(reportDir, `${page.name}-${device}.audits.json`),
        JSON.stringify({ url, at: new Date().toISOString(), audits: picked }, null, 2),
      );
    }
  }
} finally {
  await chrome.kill();
}

const unknown = AUDITS.filter((id) => !knownAudits.has(id));
if (unknown.length) {
  console.log(`\nAudit ids not found in the last run: ${unknown.join(", ")}`);
}
console.log(`\nReports: ${reportDir}/<page>-<device>.audits.json`);
console.log(failures === 0 ? "All chosen audits pass ✓" : `${failures} audit(s) still failing ✗`);
process.exitCode = failures === 0 ? 0 : 1;
