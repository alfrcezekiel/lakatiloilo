import { expect, test } from "../fixtures/test";

// Ticket 161: an accommodation page has the same layout as a destination
// page. Public reads only, from the team's running website and backend.

test.describe("An accommodation page", () => {
  test("shows its name, Getting there and Reviews, and fits the screen", async ({ page }) => {
    const answer = await page.request.get("/api/v1/accommodations");
    expect(answer.ok()).toBe(true);
    const accommodations = (await answer.json()) as { id: string; name: string }[];
    expect(accommodations.length).toBeGreaterThan(0);
    const stay = accommodations[0];

    await page.goto(`/accommodations/${stay.id}`);

    await expect(page.getByRole("heading", { level: 1 })).toHaveText(stay.name);
    await expect(page.getByRole("heading", { level: 2, name: /Getting there/ })).toBeVisible();
    await expect(page.getByRole("heading", { level: 2, name: /Reviews/ })).toBeVisible();
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
