import { expect, test } from "@playwright/test";

// After a push: is the live site up and working? READ-ONLY. It opens pages
// and reads them. It never logs in, never fills in or sends a form, and
// never clicks anything that saves. Run with `npm run test:smoke`.

const API = "https://api-lakat-iloilo.vercel.app";

test.describe("Live site (read-only)", () => {
  test("the home page loads with places to visit", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lakat na, Iloilo.");
    await expect(page.locator('a[href^="/destinations/"]').first()).toBeVisible();
  });

  test("a place page loads its reviews from the live API", async ({ page }) => {
    await page.goto("/");
    const firstPlace = page.locator('a[href^="/destinations/"]').first();
    const href = await firstPlace.getAttribute("href");

    const reviews = page.waitForResponse((r) => r.url().startsWith(`${API}/v1/reviews`) && r.request().method() === "GET");
    await page.goto(href!);

    expect((await reviews).status()).toBe(200);
    await expect(page.getByRole("heading", { level: 2, name: "Reviews" })).toBeVisible();
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
