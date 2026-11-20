import { defineConfig, devices } from "@playwright/test";

// The team's test account for the real-write tests, if they made one
// (.env.test.local, never committed; see .env.test.example). Node reads it
// itself, so no extra package is needed.
try {
  process.loadEnvFile(".env.test.local");
} catch {
  // No file: the real-write tests are skipped.
}

// End-to-end, accessibility and live smoke tests (layers 5 and 6 in
// docs/TESTING.md). Playwright drives a real Chromium browser through the
// app, like a traveler would.
//
//   npm run test:e2e    → laptop + phone, against the team's running dev
//                         servers (localhost:3000 and :5000). Start them
//                         first; Playwright never starts a second backend.
//   npm run test:smoke  → read-only checks on the live URL, after a push.
//   npm run test:smoke:local → the same read-only checks on the team's
//                         running dev servers, before a push.
//   npm run test:writes → REAL writes with the team's test account, on
//                         localhost (e2e/real-writes/). The team runs it.
// BASE_URL points the local projects at another local server, for example
// a production build (`npm run build`, then `npx next start -p 3100`):
//   BASE_URL=http://localhost:3100 npm run test:e2e
// (PowerShell: $env:BASE_URL="http://localhost:3100"; npm run test:e2e)
const LOCAL = process.env.BASE_URL ?? "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  // The dev server compiles a page the first time it is opened, so give
  // it time, and keep the number of browsers at once small.
  timeout: 60_000,
  expect: { timeout: 10_000 },
  workers: 2,
  retries: 0,
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  use: {
    // On a failure, keep a step-by-step recording to open with
    // `npx playwright show-trace`.
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "local",
      testIgnore: /smoke\/|real-writes\//,
      use: { ...devices["Desktop Chrome"], baseURL: LOCAL, viewport: { width: 1280, height: 800 } },
    },
    {
      // The same flows on a 375 px phone. Accessibility scans run once, on
      // the laptop project.
      name: "local-phone",
      testIgnore: /smoke\/|a11y\/|real-writes\//,
      use: {
        ...devices["Desktop Chrome"],
        baseURL: LOCAL,
        viewport: { width: 375, height: 812 },
        isMobile: true,
        hasTouch: true,
      },
    },
    {
      // REAL writes with the team's test account (localhost only). Not
      // part of test:e2e; skipped without .env.test.local.
      name: "real-writes",
      testMatch: /real-writes\/.*\.spec\.ts/,
      use: { ...devices["Desktop Chrome"], baseURL: LOCAL, viewport: { width: 1280, height: 800 } },
    },
    {
      // Read-only: opens pages and reads text. Never logs in, never sends
      // a form (see .claude/rules/testing.md).
      name: "live",
      testMatch: /smoke\/.*\.spec\.ts/,
      metadata: { api: "https://api-lakat-iloilo.vercel.app" },
      use: { ...devices["Desktop Chrome"], baseURL: "https://lakat-iloilo.vercel.app" },
    },
    {
      // The same read-only smoke checks on the team's running dev servers
      // (localhost:3000 and the backend on :5000), before a push.
      name: "smoke-local",
      testMatch: /smoke\/.*\.spec\.ts/,
      metadata: { api: "http://localhost:5000" },
      use: { ...devices["Desktop Chrome"], baseURL: LOCAL },
    },
  ],
});
