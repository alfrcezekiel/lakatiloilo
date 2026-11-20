import { expect, test } from "@playwright/test";

// After a push: is the live site up and working? READ-ONLY. It opens pages
// and reads them. It never logs in, never fills in or sends a form, and
// never clicks anything that saves. Run with `npm run test:smoke`.

// The backend itself, for the checks that call it straight from the test
// (not from a browser). Browsers reach it only through the website's /api
// proxy (tickets 151–153), so page checks look for /api/v1/... instead.
const API = "https://api-lakat-iloilo.vercel.app";

test.describe("Live site (read-only)", () => {
  test("the home page loads with places to visit", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lakat na, Iloilo.");
    await expect(page.locator('a[href^="/destinations/"]').first()).toBeVisible();
  });

  test("a place page loads its reviews through the website's /api proxy", async ({ page, baseURL }) => {
    await page.goto("/");
    const firstPlace = page.locator('a[href^="/destinations/"]').first();
    const href = await firstPlace.getAttribute("href");

    const reviews = page.waitForResponse(
      (r) => r.url().startsWith(`${baseURL}/api/v1/reviews`) && r.request().method() === "GET",
    );
    // No request from the page may go to the backend's own address.
    const direct: string[] = [];
    page.on("request", (r) => {
      if (r.url().startsWith(API)) direct.push(r.url());
    });
    await page.goto(href!);

    expect((await reviews).status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Reviews" })).toBeVisible();
    expect(direct).toEqual([]);
  });

  test("the /api proxy answers reads, refuses a write without a login, and forwards only v1", async ({ request }) => {
    expect((await request.get("/api/v1/destinations")).status()).toBe(200);
    expect((await request.post("/api/v1/reviews", { data: {} })).status()).toBe(401);
    expect((await request.get("/api/admin")).status()).toBe(404);
  });

  test("pages send the enforced Content-Security-Policy (ticket 156)", async ({ request }) => {
    const res = await request.get("/");

    expect(res.headers()["content-security-policy"]).toContain("default-src 'self'");
    expect(res.headers()["content-security-policy-report-only"]).toBeUndefined();
  });

  test("the login page loads (nothing is typed or sent)", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back, lakat.");
  });

  test("the live API answers and refuses a write without a login", async ({ request }) => {
    const list = await request.get(`${API}/v1/destinations`);
    expect(list.status()).toBe(200);

    // A refusal check only: with no login the API must say no (401), and
    // nothing is saved.
    const write = await request.post(`${API}/v1/reviews`, { data: {} });
    expect(write.status()).toBe(401);
  });

  test("the live API sends its security headers", async ({ request }) => {
    const res = await request.get(`${API}/v1/categories`);

    expect(res.headers()["x-content-type-options"]).toBe("nosniff");
    expect(res.headers()["x-frame-options"]).toBe("DENY");
    expect(res.headers()["x-powered-by"]).toBeUndefined();
  });
});
