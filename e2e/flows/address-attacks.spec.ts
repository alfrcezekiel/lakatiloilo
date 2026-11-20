import type { Page } from "@playwright/test";
import { expect, pretendSession, test } from "../fixtures/test";

// Attacks through the page's own ADDRESS (DOM XSS and open redirects), in a
// real browser. These are the attacks ZAP's DOM XSS rule tries; ZAP proved
// it could not load the website's pages on the dev server (2026-11-18), so
// they are tested here directly.
//
// Read-only: page loads with odd addresses, plus a PRETEND login answer.
// Nothing is saved.

const PLACE = "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d";

// A payload that tries to run a script AND leaves a marker if it ever
// becomes real HTML on the page.
const SCRIPT = `<img src=x onerror="window.__xss=1" data-xss="1"><script>window.__xss=1</script>`;
const PAYLOADS = [
  SCRIPT,
  `"><svg onload="window.__xss=1" data-xss="1">`,
  `javascript:window.__xss=1`,
];

// Fails the test if anything injected ever ran or became an element.
async function expectNoInjection(page: Page, where: string) {
  await page.waitForTimeout(400); // let client code read the address
  const ran = await page.evaluate(() => (window as unknown as { __xss?: number }).__xss === 1);
  const elements = await page.locator("[data-xss]").count();
  expect(ran, `a script from the address ran on ${where}`).toBe(false);
  expect(elements, `HTML from the address became an element on ${where}`).toBe(0);
}

test.describe("Attacks through the address (DOM XSS)", () => {
  // The pages that read their own address (?focus=, ?next=, ?mode=, the
  // reset-password link), plus home, with a payload in every place.
  for (const [name, path, param] of [
    ["A place page, ?focus=", PLACE, "focus"],
    ["Log in, ?next=", "/login", "next"],
    ["Log in, ?mode=", "/login", "mode"],
    ["Reset password, ?code=", "/reset-password", "code"],
    ["Reset password, ?error_description=", "/reset-password", "error_description"],
    ["Home, ?q=", "/", "q"],
  ] as const) {
    test(`${name}: no script from the address runs`, async ({ page }) => {
      const dialogs: string[] = [];
      page.on("dialog", (d) => {
        dialogs.push(d.message());
        return d.dismiss();
      });

      for (const payload of PAYLOADS) {
        await page.goto(`${path}?${param}=${encodeURIComponent(payload)}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoInjection(page, `${path}?${param}=…`);

        await page.goto(`${path}#${encodeURIComponent(payload)}`);
        await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
        await expectNoInjection(page, `${path}#…`);
      }
      expect(dialogs, "an alert/confirm popped up").toEqual([]);
    });
  }
});

test.describe("After log-in, ?next= never leaves the site (open redirect)", () => {
  // Each one tries to send the traveler somewhere else after a successful
  // log-in: a script, another website, or tricks that browsers turn into
  // "//evil.example" (they silently drop tabs and newlines in addresses,
  // and treat "\" like "/").
  const ATTEMPTS = [
    "javascript:window.__xss=1",
    "//evil.example",
    "https://evil.example",
    "/\\evil.example",
    "/\t/evil.example",
    "/\n/evil.example",
    "/%2F/evil.example",
    "/ /evil.example",
  ];

  for (const next of ATTEMPTS) {
    test(`?next=${JSON.stringify(next)} stays on the site (pretend log-in)`, async ({ page, pretendLogin }) => {
      await pretendLogin({ alreadyLoggedIn: false });
      await page.route("**/v1/auth/login", (route) => route.fulfill({ json: { session: pretendSession() } }));
      // Every attempt to load another website, seen before it is blocked.
      const leftTheSite: string[] = [];
      page.on("request", (r) => {
        if (r.isNavigationRequest() && !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(r.url())) leftTheSite.push(r.url());
      });

      await page.goto(`/login?next=${encodeURIComponent(next)}`);
      await page.getByRole("textbox", { name: "Email", exact: true }).fill("juan@example.test");
      await page.getByLabel("Password", { exact: true }).fill("pretend-password");
      await page.getByRole("button", { name: "Log in", exact: true }).last().click();

      // The login finishes and the app moves on: wait until it leaves /login.
      await page.waitForURL((url) => !url.pathname.startsWith("/login") || leftTheSite.length > 0, { timeout: 15_000 }).catch(() => {});
      await page.waitForTimeout(500);

      expect(leftTheSite, `after log-in the browser tried to open ${leftTheSite.join(", ")}`).toEqual([]);
      expect(new URL(page.url()).host).toBe(new URL(test.info().project.use.baseURL!).host);
      await expectNoInjection(page, "the page after log-in");
    });
  }
});
