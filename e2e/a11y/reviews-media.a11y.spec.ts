import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../fixtures/test";
import { PLACE_PATH, TEN_REVIEWS, answerReviews } from "../fixtures/reviews";

// Tickets 162–166: the sort chips, Show more and a review's video note, in
// each state, checked by axe against WCAG 2.2 AA. The reviews are PRETEND.

const REVIEWS = 'section[aria-labelledby="reviews-heading"]';

async function problemsIn(page: import("@playwright/test").Page) {
  // Colours are measured once the finite animations have ended.
  await page.waitForFunction(() =>
    document.getAnimations().every((a) => a.playState !== "running" || a.effect?.getTiming().iterations === Infinity),
  );
  const results = await new AxeBuilder({ page })
    .include(REVIEWS)
    .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
    .analyze();
  return results.violations.flatMap((v) =>
    v.nodes.map((n) => `${v.impact} · ${v.id} · ${n.target.join(" ")}\n    ${n.html.slice(0, 140)}`),
  );
}

test.describe("Accessibility of the reviews controls (axe, WCAG 2.2 AA)", () => {
  test.beforeEach(async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await answerReviews(page, TEN_REVIEWS);
    await page.goto(PLACE_PATH);
    await expect(page.getByRole("button", { name: "Show more reviews" })).toBeVisible();
  });

  test("the first view with chips and Show more has no problems axe can find (pretend reviews)", async ({ page }) => {
    const problems = await problemsIn(page);

    expect(problems, problems.join("\n")).toEqual([]);
  });

  test("With photos & videos, with its video note, has no problems axe can find (pretend reviews)", async ({ page }) => {
    await page.getByRole("button", { name: "With photos & videos" }).click();
    await expect(page.getByText("This video can't play in this browser.").first()).toBeVisible();

    const problems = await problemsIn(page);

    expect(problems, problems.join("\n")).toEqual([]);
  });
});
