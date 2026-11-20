import type { Page } from "@playwright/test";

// Records every time the browser refuses something because of the
// Content-Security-Policy. Shared by e2e/flows and e2e/smoke.

export type Violation = { blocked: string; directive: string; disposition: string };

// Start listening before the page's own code runs.
export async function listenForViolations(page: Page) {
  await page.addInitScript(() => {
    const seen: { blocked: string; directive: string; disposition: string }[] = [];
    (window as unknown as { __csp: typeof seen }).__csp = seen;
    document.addEventListener("securitypolicyviolation", (event) => {
      seen.push({ blocked: event.blockedURI, directive: event.effectiveDirective, disposition: event.disposition });
    });
  });
}

export const violations = (page: Page) =>
  page.evaluate(() => (window as unknown as { __csp: Violation[] }).__csp);
