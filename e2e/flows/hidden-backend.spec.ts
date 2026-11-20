import type { Page } from "@playwright/test";
import { expect, test } from "../fixtures/test";

// The NestJS backend's address stays a secret (tickets 151–153).
//
// The browser only ever talks to the website itself: /api/v1/... on
// localhost:3000 (the live site: lakat-iloilo.vercel.app/api). The website's
// server passes each call on to the backend, whose address lives only in
// the server-side API_URL. So a visitor can't find the backend in the
// network tab or in any file their browser downloads, and can't call it
// directly.
//
// Read-only: page loads and public GET requests. Nothing is saved.

// Every way the backend's address could leak: the local backend, the live
// backend's host, and the old variable name that copied it into the
// browser's JavaScript (removed in ticket 153).
const BACKEND_ADDRESSES = ["localhost:5000", "127.0.0.1:5000", "api-lakat-iloilo", "NEXT_PUBLIC_API_URL"];
const PLACE = "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d";
const ACCOMMODATION = "/accommodations/fc4df660-ddb0-4927-8e00-406a011c05cf";

// Opens the pages a traveler sees most, and records every request the
// browser makes. Then downloads each page, script and data answer again
// (GET only), to read its text: the browser throws a page's text away once
// it moves on to the next page, so reading it during the visit would miss
// some files without saying so.
async function browseLikeATraveler(page: Page) {
  const requests: string[] = [];
  const toRead = new Set<string>();
  page.on("request", (request) => {
    requests.push(request.url());
    const type = request.resourceType();
    const ours = request.url().startsWith(`${test.info().project.use.baseURL}/`);
    if (ours && request.method() === "GET" && ["document", "script", "fetch", "xhr"].includes(type)) {
      toRead.add(request.url());
    }
  });

  await page.goto("/");
  await page.getByRole("combobox", { name: "Where to?" }).fill("batchoy");
  await expect(page.getByRole("option").first()).toBeVisible();
  for (const path of [PLACE, ACCOMMODATION, "/login"]) {
    await page.goto(path);
    await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  }
  await page.waitForLoadState("networkidle");

  const downloads = await Promise.all(
    [...toRead].map(async (url) => ({ url, text: await (await page.request.get(url)).text() })),
  );
  return { requests, downloads };
}

test.describe("The backend's address stays hidden", () => {
  // The same answers on every screen size: run once, on the laptop.
  test.skip(({ isMobile }) => isMobile, "Checked once, on the laptop project.");

  test("browsing calls only the website's own /api, never the backend directly", async ({ page }) => {
    const { requests } = await browseLikeATraveler(page);

    const toBackend = requests.filter((url) => BACKEND_ADDRESSES.some((address) => url.includes(address)));
    expect(toBackend, "the browser called the backend directly").toEqual([]);
    // And the data really came through /api (so the check above means something).
    expect(requests.some((url) => url.startsWith(`${test.info().project.use.baseURL}/api/v1/`))).toBe(true);
  });

  test("no page, script or answer the browser downloads names the backend's address", async ({ page }) => {
    const { downloads } = await browseLikeATraveler(page);

    // Proof the files were really read: the log-in page's own words are in
    // them (so an empty download can't make this test pass by mistake).
    expect(downloads.length).toBeGreaterThan(5);
    expect(downloads.some(({ text }) => text.includes("Welcome back"))).toBe(true);
    const leaks = downloads.flatMap(({ url, text }) =>
      BACKEND_ADDRESSES.filter((address) => text.includes(address)).map((address) => `${address} in ${url}`),
    );
    expect(leaks, "the backend's address reached the browser").toEqual([]);
  });

  test("the website's /api passes on public reads, and says nothing about the backend", async ({ request }) => {
    const response = await request.get("/api/v1/destinations");

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toContain("application/json");
    expect(Array.isArray(await response.json())).toBe(true);
    // Only content-type and cache-control are passed back (ticket 151), so
    // nothing tells a visitor what runs behind /api.
    expect(response.headers()["x-powered-by"]).toBeUndefined();
    expect(JSON.stringify(response.headers())).not.toMatch(/localhost:5000|api-lakat-iloilo/);
  });

  test("the website's /api refuses anything outside v1/, so it can't reach other places", async ({ request }) => {
    for (const path of ["/api/health", "/api/admin", "/api/v2/destinations", "/api/v1/..%2F..%2Fadmin"]) {
      const response = await request.get(path);

      expect(response.status(), path).toBe(404);
      const text = await response.text();
      expect(text, path).not.toMatch(/localhost:5000|api-lakat-iloilo|stack|Error:/);
    }
  });
});
