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
import { BACKEND_ADDRESSES, EXTRA_METRICS, SCORE_BUDGETS, VITALS_BUDGETS } from "./budgets.mjs";

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
// Lighthouse's own measure of this computer's speed (benchmarkIndex). It
// slows the CPU 4× to imitate a phone, so a slow laptop means a slow
// "phone": on battery (powersave) this laptop scored ~1,550 instead of
// ~2,970 and phone TBT came out 2–3× worse (2026-11-18 and 2026-11-21).
const SLOW_CPU = 2000;
const cpuScores = [];

const items = (lhr, id) => lhr.audits[id]?.details?.items ?? [];
const text = (value) => (typeof value === "string" ? value : value?.formattedDefault ?? value?.text ?? JSON.stringify(value ?? ""));

// - The CSP is enforced (Lighthouse's "csp-xss" audit reads the page's
//   real header; a missing or report-only policy is a High finding there).
//   Lighthouse also rates some fine choices High-risk ("Host allowlists
//   can frequently be bypassed": we list 'self' next to the nonce and use
//   no 'strict-dynamic'); only the findings below mean our policy really is
//   missing or weak: no enforced policy, 'unsafe-inline' scripts, no
//   object-src, script-src or base-uri, or a short nonce.
// - The app's own code caused no CSP violation (the console stays clean
//   of "Content Security Policy" errors).
// - No request the page made went to the backend's address: everything
//   goes through the website's /api (tickets 151–153).
function securityChecks(lhr) {
  const csp = items(lhr, "csp-xss").filter((item) => item.severity === "High" || text(item.severity).includes("High"));
  const weak = csp
    .map((item) => `${text(item.directive)} ${text(item.description)}`.trim())
    .filter((line) => /No CSP found in enforcement mode|unsafe in-page scripts|Missing `object-src`|`script-src` directive is missing|Missing `base-uri`|Nonces should/i.test(line));
  const violations = items(lhr, "errors-in-console")
    .map((item) => text(item.description))
    .filter((line) => /Content Security Policy/i.test(line));
  const leaks = items(lhr, "network-requests")
    .map((item) => item.url)
    .filter((url) => BACKEND_ADDRESSES.some((address) => url.includes(address)));
  return [
    { label: "CSP enforced, scripts need a nonce", problems: weak },
    { label: "No CSP violation in the console", problems: violations },
    { label: "No request to the backend's address", problems: leaks },
  ];
}

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
      cpuScores.push(lhr.environment?.benchmarkIndex ?? 0);
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
      // Security checks (tickets 151–156), read from the same visit. Any ✗
      // counts as a missed budget.
      for (const { label, problems } of securityChecks(lhr)) {
        const ok = problems.length === 0;
        if (!ok) missed++;
        row.security = { ...row.security, [label]: ok };
        console.log(`   ${ok ? "✓" : "✗"} ${label}`);
        for (const problem of problems.slice(0, 5)) console.log(`        – ${problem}`);
      }
      summary.push(row);
    }
  }
} finally {
  await chrome.kill();
}

writeFileSync(join(reportDir, "summary.json"), JSON.stringify({ baseUrl: BASE_URL, at: new Date().toISOString(), cpuScore: Math.min(...cpuScores), pages: summary }, null, 2));
console.log(`\nReports: ${reportDir}/<page>-<device>.html (open in a browser)`);
const cpu = Math.min(...cpuScores);
if (cpu < SLOW_CPU) {
  console.warn(
    `\n⚠ This computer's CPU score was ${cpu} (under ${SLOW_CPU}). Is it on battery? Phone TBT and Performance\n` +
      "  come out 2–3× worse than they are. Plug in the charger and run again before judging the phone speed.",
  );
}
console.log(missed === 0 ? "All budgets met ✓" : `${missed} budget(s) missed ✗`);
process.exitCode = missed === 0 ? 0 : 1;
