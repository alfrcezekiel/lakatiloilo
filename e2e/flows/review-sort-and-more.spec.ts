import type { Page } from "@playwright/test";
import { PRETEND_TRAVELER, expect, test } from "../fixtures/test";
import { PLACE_PATH, TEN_REVIEWS, answerReviews, pretendReview, reviewComment, reviewId } from "../fixtures/reviews";

// Tickets 162 and 163: a traveler sorts a place's reviews and opens more of
// them, on a laptop and a 375 px phone. The reviews are PRETEND answers.

const cards = (page: Page) => page.locator('li[id^="review-"]');
const comments = (...numbers: number[]) => numbers.map(reviewComment);
const chip = (page: Page, name: string) =>
  page.getByRole("group", { name: "Sort reviews" }).getByRole("button", { name, exact: true });
const showMore = (page: Page) => page.getByRole("button", { name: "Show more reviews" });

test.describe("Sorting a place's reviews and showing more", () => {
  test("opens on Most relevant with the 3 most Helpful reviews (pretend reviews)", async ({ page }) => {
    await answerReviews(page, TEN_REVIEWS);

    await page.goto(PLACE_PATH);

    await expect(chip(page, "Most relevant")).toHaveAttribute("aria-pressed", "true");
    await expect(cards(page)).toContainText(comments(10, 9, 1));
    await expect(page.getByText("Showing 3 of 10")).toBeVisible();
  });

  test("Show more adds 5, moves the focus to the first new review, then disappears (pretend reviews)", async ({ page }) => {
    await answerReviews(page, TEN_REVIEWS);
    await page.goto(PLACE_PATH);

    await showMore(page).click();

    await expect(cards(page)).toContainText(comments(10, 9, 1, 2, 3, 4, 5, 6));
    await expect(page.getByText("Showing 8 of 10")).toBeVisible();
    await expect(page.locator(`[id="review-${reviewId(2)}"]`)).toBeFocused();

    await showMore(page).click();

    await expect(cards(page)).toHaveCount(10);
    await expect(showMore(page)).toHaveCount(0);
  });

  test("Newest lists every review by date and goes back to the first 3 (pretend reviews)", async ({ page }) => {
    await answerReviews(page, TEN_REVIEWS);
    await page.goto(PLACE_PATH);
    await showMore(page).click();
    await expect(page.getByText("Showing 8 of 10")).toBeVisible();

    await chip(page, "Newest").click();

    await expect(chip(page, "Newest")).toHaveAttribute("aria-pressed", "true");
    await expect(chip(page, "Most relevant")).toHaveAttribute("aria-pressed", "false");
    await expect(cards(page)).toContainText(comments(1, 2, 3));
    await expect(page.getByText("Showing 3 of 10")).toBeVisible();
  });

  test("With photos & videos keeps only the reviews with a video (pretend reviews)", async ({ page }) => {
    await answerReviews(page, TEN_REVIEWS);
    await page.goto(PLACE_PATH);
    await expect(cards(page)).toHaveCount(3);

    await chip(page, "With photos & videos").click();

    await expect(cards(page)).toContainText(comments(4, 7));
    await expect(showMore(page)).toHaveCount(0);
  });

  test("says so when no review has a photo or video (pretend reviews)", async ({ page }) => {
    await answerReviews(page, [pretendReview(1), pretendReview(2)]);
    await page.goto(PLACE_PATH);
    await expect(cards(page)).toHaveCount(2);

    await chip(page, "With photos & videos").click();

    await expect(page.getByText("No reviews with photos or videos yet.")).toBeVisible();
    await expect(cards(page)).toHaveCount(0);
  });

  test("shows no chips and no Show more for a place with no reviews (pretend answer)", async ({ page }) => {
    await answerReviews(page, []);

    await page.goto(PLACE_PATH);

    await expect(page.getByText("No reviews yet.")).toBeVisible();
    await expect(page.getByRole("group", { name: "Sort reviews" })).toHaveCount(0);
    await expect(showMore(page)).toHaveCount(0);
  });

  test("the traveler's own review stays first, and needs media under With photos & videos (pretend login and reviews)", async ({
    page,
    pretendLogin,
  }) => {
    await pretendLogin();
    await answerReviews(
      page,
      TEN_REVIEWS.map((review) => (review.id === reviewId(8) ? { ...review, user_id: PRETEND_TRAVELER.id } : review)),
    );

    await page.goto(PLACE_PATH);
    await expect(cards(page)).toContainText(comments(8, 10, 9));

    await chip(page, "Newest").click();
    await expect(cards(page)).toContainText(comments(8, 1, 2));

    await chip(page, "With photos & videos").click();
    await expect(cards(page)).toContainText(comments(4, 7));
  });

  test("the chips are at least 44 px tall and nothing runs off the screen (pretend reviews)", async ({ page }) => {
    await answerReviews(page, TEN_REVIEWS);
    await page.goto(PLACE_PATH);
    await expect(chip(page, "Newest")).toBeVisible();

    for (const name of ["Most relevant", "With photos & videos", "Newest"]) {
      const box = await chip(page, name).boundingBox();
      expect(box?.height ?? 0, `${name} height`).toBeGreaterThanOrEqual(44);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth);
    expect(overflow).toBeLessThanOrEqual(0);
  });
});
