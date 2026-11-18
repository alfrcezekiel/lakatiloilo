// Lighthouse: page speed (Core Web Vitals), accessibility, best practices
// and SEO, scored by Google's free tool in a real (headless) Chrome.
// Layer 8 in docs/TESTING.md, rules in .claude/rules/testing.md.
//
//   npm run perf:lighthouse
//
// READ-ONLY: it opens a few pages like a visitor, nothing else. By default
// it checks the LIVE site, the real production build. The dev server
// (npm run dev) is not optimised, so its speed scores mean nothing. To check
// unpushed changes, stop `npm run dev`, then run `npm run build`, then
// `npm start`, and use -- BASE_URL=http://localhost:3000.
//
// Settings (environment variables, or after `--` on the npm line):
//   BASE_URL  default https://lakat-iloilo.vercel.app
//   DEVICES   "mobile,desktop" (default), or just one of them
//   PAGES     "home,place,login" (default), or some of them
//
// Each page is checked twice: as a mid-range phone on slow 4G (Lighthouse's
// "mobile", what Google uses) and as a laptop ("desktop"). HTML reports land
// in performance/lighthouse/reports/ (git-ignored). The exit code is 1 if
// any budget in budgets.js was missed.

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";
import desktopConfig from "lighthouse/core/config/desktop-config.js";
import { EXTRA_METRICS, SCORE_BUDGETS, VITALS_BUDGETS } from "./budgets.mjs";

const args = Object.fromEntries(
  process.argv.slice(2).filter((a) => a.includes("=")).map((a) => a.split(/=(.*)/s).slice(0, 2)),
);
const BASE_URL = (args.BASE_URL ?? process.env.BASE_URL ?? "https://lakat-iloilo.vercel.app").replace(/\/+$/, "");
const DEVICES = (args.DEVICES ?? process.env.DEVICES ?? "mobile,desktop").split(",").map((d) => d.trim());

// The pages a traveler sees most: home, one place, log in.
// PAGES=home,place checks only those (by name).
const ALL_PAGES = [
  { name: "home", path: "/" },
  { name: "place", path: "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d" },
  { name: "login", path: "/login" },
];
const only = (args.PAGES ?? process.env.PAGES ?? "").split(",").map((p) => p.trim()).filter(Boolean);
const PAGES = only.length ? ALL_PAGES.filter((p) => only.includes(p.name)) : ALL_PAGES;

if (/localhost:3000/.test(BASE_URL)) {
  console.warn(
    "⚠ localhost:3000: if this is `npm run dev`, the speed scores are meaningless (dev code is not optimised).\n" +
      "  Use `npm run build` + `npm start` for a fair local check. Accessibility, best practices and SEO are still useful.\n",
  );
}

const here = dirname(fileURLToPath(import.meta.url));
const reportDir = join(here, "reports");
mkdirSync(reportDir, { recursive: true });

const fmt = (value, unit) => (unit === "ms" ? `${Math.round(value)} ms` : value.toFixed(3));
let missed = 0;
const summary = [];

const chrome = await chromeLauncher.launch({ chromeFlags: ["--headless=new", "--no-first-run"] });
try {
  for (const device of DEVICES) {
    for (const page of PAGES) {
      const url = `${BASE_URL}${page.path}`;
      const config = device === "desktop" ? desktopConfig : undefined;
      const result = await lighthouse(
        url,
        { port: chrome.port, output: "html", logLevel: "error", onlyCategories: Object.keys(SCORE_BUDGETS) },
        config,
      );
      const lhr = result.lhr;
      writeFileSync(join(reportDir, `${page.name}-${device}.html`), result.report);

      console.log(`\n== ${page.name} (${page.path}) · ${device}`);
      const row = { page: page.name, device, scores: {}, vitals: {}, problems: [] };

      for (const [id, min] of Object.entries(SCORE_BUDGETS)) {
        const score = Math.round((lhr.categories[id]?.score ?? 0) * 100);
        const ok = score >= min;
        if (!ok) missed++;
        row.scores[id] = score;
        console.log(`   ${ok ? "✓" : "✗"} ${lhr.categories[id].title.padEnd(15)} ${String(score).padStart(3)} (budget ≥ ${min})`);
        // Name the checks that pulled a score down (not for performance,
        // whose numbers are below).
        if (id !== "performance") {
          for (const ref of lhr.categories[id].auditRefs) {
            const audit = lhr.audits[ref.id];
            if (ref.weight > 0 && audit.score !== null && audit.score < 1) {
              row.problems.push(`${id}: ${audit.title}`);
              console.log(`        – ${audit.title}`);
            }
          }
        }
      }

      for (const [id, { label, max, unit }] of Object.entries(VITALS_BUDGETS)) {
        const value = lhr.audits[id].numericValue;
        const ok = value <= max;
        if (!ok) missed++;
        row.vitals[label] = unit === "ms" ? Math.round(value) : Number(value.toFixed(3));
        console.log(`   ${ok ? "✓" : "✗"} ${label.padEnd(15)} ${fmt(value, unit).padStart(9)} (good ≤ ${unit === "ms" ? `${max} ms` : max})`);
      }
      for (const [id, label] of Object.entries(EXTRA_METRICS)) {
        row.vitals[label] = Math.round(lhr.audits[id].numericValue);
        console.log(`     ${label.padEnd(15)} ${fmt(lhr.audits[id].numericValue, "ms").padStart(9)}`);
      }
      summary.push(row);
    }
  }
} finally {
  await chrome.kill();
}

writeFileSync(join(reportDir, "summary.json"), JSON.stringify({ baseUrl: BASE_URL, at: new Date().toISOString(), pages: summary }, null, 2));
console.log(`\nReports: ${reportDir}/<page>-<device>.html (open in a browser)`);
console.log(missed === 0 ? "All budgets met ✓" : `${missed} budget(s) missed ✗`);
process.exitCode = missed === 0 ? 0 : 1;
