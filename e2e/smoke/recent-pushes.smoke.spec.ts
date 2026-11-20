import { expect, test, type Page } from "@playwright/test";
import { listenForViolations, violations } from "../helpers/csp";

// After a push: do the features from the latest pushes still work on the
// deployed site? READ-ONLY, like live.smoke.spec.ts: it opens pages and
// reads them, never logs in, never fills in or sends a form.
//
//   - photos at their original size, small WebP review previews
//     (a80bc79, 58ddb0a)
//   - the Wikimedia photo relay, /api/wikimedia-photo (58ddb0a)
//   - the enforced Content-Security-Policy, with Supabase still working
//     (tickets 155–156)
//   - the backend's address kept out of the browser's files (ticket 153)
//   - the website running in Mumbai, next to the backend (d1137f1)
//
// Run with `npm run test:smoke` (live site) or `npm run test:smoke:local`
// (the team's dev servers). A few checks only mean something on the real
// production build; they say so and are skipped on smoke-local.

const PLACE = "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d";
const ACCOMMODATION = "/accommodations/fc4df660-ddb0-4927-8e00-406a011c05cf";
const TRAVELER_PAGES = ["/", PLACE, ACCOMMODATION];
const BACKEND_ADDRESSES = ["api-lakat-iloilo", "localhost:5000", "127.0.0.1:5000", "NEXT_PUBLIC_API_URL"];

const isLive = () => test.info().project.name === "live";

// /admin/login preloads the dashboard (router.prefetch in AdminSignIn.tsx).
// For a visitor without an admin login that preload is a 404, and on a
// local production build (`next start`) the browser never finishes reading
// it, so the network never goes quiet there (found 2026-11-20; the code
// before the nonce change does the same, and Vercel finishes it). That
// page has no photos that load late, so "load" is enough there.
// Opens a page and scrolls to the bottom, so photos that load only when
// they come into view (loading="lazy") are loaded too.
async function openFully(page: Page, path: string) {
  await page.goto(path);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((resolve) => requestAnimationFrame(resolve));
    }
  });
  await page.waitForLoadState(path === "/admin/login" ? "load" : "networkidle");
}

// Every <img> on the page: the address it really loaded, and whether it
// finished and has a picture (a broken image finishes with width 0).
const photos = (page: Page) =>
  page.$$eval("img", (images) =>
    images.map((img) => ({ src: img.currentSrc || img.src, done: img.complete, width: img.naturalWidth })),
  );

test.describe("Recent pushes (read-only)", () => {
  test("no photo is broken on the home, place and accommodation pages", async ({ page }) => {
    for (const path of TRAVELER_PAGES) {
      await openFully(page, path);

      const all = await photos(page);
      const broken = all.filter((p) => p.done && p.width === 0).map((p) => p.src);
      expect(broken, `broken photos on ${path}`).toEqual([]);
      expect(all.filter((p) => p.width > 0).length, `no photo loaded on ${path}`).toBeGreaterThan(0);
    }
  });

  test("place photos come at their original uploaded size, not a resized copy (a80bc79)", async ({ page }) => {
    await openFully(page, "/");

    const placePhotos = (await photos(page)).filter((p) => p.src.includes("/place-photos/"));
    expect(placePhotos.length, "the home page shows no uploaded place photo").toBeGreaterThan(0);
    for (const photo of placePhotos) {
      expect(photo.src, "a place photo was resized").toContain("/storage/v1/object/public/place-photos/");
      expect(photo.width).toBeGreaterThan(0);
    }
  });

  test("review photo previews are small WebP copies, with the original kept for opening (58ddb0a)", async ({ page }) => {
    await openFully(page, PLACE);

    const reviewPhotos = (await photos(page)).filter((p) => p.src.includes("/review-photos/"));
    const previews = reviewPhotos.filter((p) => p.src.includes("/render/image/"));
    expect(previews.length, "no review photo preview on the place page").toBeGreaterThan(0);
    for (const preview of previews) {
      expect(preview.src).toContain("format=webp");
      expect(preview.src).toMatch(/[?&]width=\d+/);
      expect(preview.width, "a preview is not small").toBeLessThanOrEqual(448);
    }
    // The untouched upload is still what the photo opens to.
    expect(reviewPhotos.some((p) => p.src.includes("/storage/v1/object/public/review-photos/"))).toBe(true);
  });

  test("the Wikimedia relay serves a real thumbnail from our own site, with no cookies (58ddb0a)", async ({ page, request }) => {
    // A thumbnail the home page really shows, at a smaller Wikimedia size.
    await openFully(page, "/");
    const wikimedia = (await photos(page)).find((p) => p.src.includes("thumb.wikimedia.org/wikipedia/commons/thumb/"));
    expect(wikimedia, "the home page shows no Wikimedia photo").toBeDefined();
    const path = new URL(wikimedia!.src).pathname.replace(/\/\d+px-/, "/250px-");

    const response = await request.get(`/api/wikimedia-photo?path=${encodeURIComponent(path)}`);

    expect(response.status()).toBe(200);
    expect(response.headers()["content-type"]).toMatch(/^image\/(jpeg|png|webp|avif)$/);
    expect(response.headers()["cache-control"]).toContain("public");
    expect(response.headers()["x-content-type-options"]).toBe("nosniff");
    expect(response.headers()["set-cookie"], "Wikimedia's cookies reached the visitor").toBeUndefined();
    expect((await response.body()).byteLength).toBeGreaterThan(1000);
  });

  test("the Wikimedia relay refuses anything that is not a Wikimedia thumbnail", async ({ request }) => {
    for (const path of [
      "",
      "/etc/passwd",
      "/wikipedia/commons/thumb/a/a4/../../../../secret/250px-x.jpg",
      "/wikipedia/commons/a/a4/Iloilo_Batchoy_with_Puto.jpg",
      "https://example.com/250px-x.jpg",
    ]) {
      const response = await request.get(`/api/wikimedia-photo?path=${encodeURIComponent(path)}`);

      expect(response.status(), path || "(no path)").toBe(404);
    }
  });

  test("the enforced policy blocks nothing of ours, and live updates still connect (tickets 155–156)", async ({ page }) => {
    await listenForViolations(page);
    const sockets: string[] = [];
    page.on("websocket", (socket) => sockets.push(socket.url()));

    for (const path of [...TRAVELER_PAGES, "/login", "/forgot-password", "/admin/login"]) {
      await openFully(page, path);

      expect(await violations(page), `the policy blocked something on ${path}`).toEqual([]);
    }
    // Supabase Realtime (the "doorbell" for live updates) is on the list.
    expect(sockets.some((url) => /^wss:\/\/[a-z0-9]+\.supabase\.co\/realtime\//.test(url)), "no live-update connection").toBe(
      true,
    );
  });

  test("every page carries the full enforced policy, and the live build has no 'unsafe-eval' or 'unsafe-inline'", async ({ request }) => {
    for (const path of [...TRAVELER_PAGES, "/login", "/admin/login", "/admin/reports"]) {
      const response = await request.get(path);
      const policy = response.headers()["content-security-policy"] ?? "";

      expect(response.headers()["content-security-policy-report-only"], `${path} only warns`).toBeUndefined();
      for (const rule of [
        "default-src 'self'",
        "object-src 'none'",
        "frame-ancestors 'none'",
        "frame-src 'none'",
        "base-uri 'self'",
        "form-action 'self'",
      ]) {
        expect(policy, `${path} is missing ${rule}`).toContain(rule);
      }
      // Only our own Supabase project, never every *.supabase.co site.
      expect(policy, `${path} allows any Supabase project`).not.toContain("*.supabase.co");
      // The dev server needs 'unsafe-eval'; the production build must not
      // have it.
      if (isLive()) {
        expect(policy, `${path} allows eval`).not.toContain("'unsafe-eval'");
        // Scripts and <style> tags need this page view's nonce (ZAP
        // 2026-11-20); only style="..." attributes may be inline.
        expect(policy, `${path} allows inline scripts`).not.toMatch(/script-src [^;]*'unsafe-inline'/);
        expect(policy, `${path} allows inline <style>`).not.toMatch(/style-src [^;]*'unsafe-inline'/);
        expect(policy, `${path} has no nonce`).toMatch(/script-src [^;]*'nonce-[A-Za-z0-9+/=]{22,}'/);
      }
    }
  });

  test("no script the browser downloads names the backend's address (ticket 153)", async ({ page, baseURL }) => {
    const scripts = new Set<string>();
    page.on("request", (r) => {
      if (r.resourceType() === "script" && r.url().startsWith(baseURL!)) scripts.add(r.url());
    });
    for (const path of [...TRAVELER_PAGES, "/login"]) await openFully(page, path);

    // Download each script again to read it (the browser drops a page's
    // files once it moves on).
    const texts = await Promise.all([...scripts].map(async (url) => ({ url, text: await (await page.request.get(url)).text() })));
    expect(texts.length).toBeGreaterThan(3);
    // Proof the scripts were really read: the review form's own call is in
    // them (src/lib/api.ts joins "/api" and "/v1/..." while it runs).
    expect(texts.some(({ text }) => text.includes("/v1/reviews")), "the scripts were not really read").toBe(true);
    const leaks = texts.flatMap(({ url, text }) =>
      BACKEND_ADDRESSES.filter((address) => text.includes(address)).map((address) => `${address} in ${url}`),
    );
    expect(leaks, "the backend's address reached the browser").toEqual([]);
  });

  test("the live website answers from Mumbai, next to the backend and database (d1137f1)", async ({ request }) => {
    test.skip(!isLive(), "Only the live site runs on Vercel.");

    const response = await request.get("/api/v1/destinations");

    expect(response.status()).toBe(200);
    // x-vercel-id lists the edge, then the region that ran the code:
    // "sin1::bom1::…".
    expect(response.headers()["x-vercel-id"]).toMatch(/::bom1::/);
  });
});
