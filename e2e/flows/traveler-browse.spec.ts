import { expect, test } from "../fixtures/test";

// A traveler finding a place, on a laptop and on a 375 px phone. Uses the
// team's running website and backend for public reads only.

const BREAKTHROUGH = "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d";

test.describe("Browsing places", () => {
  test("the home page greets the traveler and lists places to visit", async ({ page }) => {
    await page.goto("/");

    await expect(page).toHaveTitle("Lakat Iloilo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Lakat na, Iloilo.");
    await expect(page.locator('a[href^="/destinations/"]').first()).toBeVisible();
  });

  test("searching by keyboard finds a place and Enter opens it", async ({ page }) => {
    await page.goto("/");
    const search = page.getByRole("combobox", { name: "Where to?" });

    await search.fill("batchoy");

    const options = page.getByRole("option");
    await expect(options.first()).toBeVisible();
    await expect(options).toContainText(["La Paz Batchoy", "Netong's Batchoy", "Ted's Oldtimer Batchoy"]);

    await search.press("Enter");

    await expect(page).toHaveURL(/\/destinations\/[0-9a-f-]{36}$/);
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("La Paz Batchoy");
  });

  test("a place page shows its name, About and Reviews, and leads back home", async ({ page }) => {
    await page.goto(BREAKTHROUGH);

    await expect(page).toHaveTitle("Breakthrough Restaurant · Lakat Iloilo");
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Breakthrough Restaurant");
    await expect(page.getByRole("heading", { level: 2, name: "About" })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: "Reviews" })).toBeVisible();

    await page.getByRole("link", { name: "Back to Home" }).click();

    await expect(page).toHaveURL(/\/$/);
  });

  test("opening a place from a home page card", async ({ page }) => {
    await page.goto("/");
    const card = page.locator(`a[href="${BREAKTHROUGH}"]`).first();
    await card.scrollIntoViewIfNeeded();

    await card.click();

    await expect(page).toHaveURL(new RegExp(`${BREAKTHROUGH}$`));
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Breakthrough Restaurant");
  });

  test("an old or mistyped place link shows a friendly page, not an error", async ({ page }) => {
    await page.goto("/destinations/99999999-9999-4999-8999-999999999999");

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Destination not found");
    await expect(page.getByText("This link may be old or mistyped.")).toBeVisible();
    await expect(page.getByRole("link", { name: "Back to Home" })).toBeVisible();
  });

  test("no page scrolls sideways (nothing wider than the screen)", async ({ page }) => {
    for (const path of ["/", BREAKTHROUGH, "/login"]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

      const tooWide = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      expect(tooWide, `${path} is ${tooWide}px wider than the screen`).toBeLessThanOrEqual(0);
    }
  });
});
