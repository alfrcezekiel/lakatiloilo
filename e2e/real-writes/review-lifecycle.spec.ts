import { expect, test, type Locator, type Page } from "@playwright/test";

// REAL WRITES: a review's whole life with the team's own TEST account.
// Write → edit → reply → delete the reply → mark another review Helpful →
// un-mark it → delete the review.
//
// This is the one place tests save real data. So:
//   - The TEAM runs it (`npm run test:writes`), with a dedicated test
//     account they created, read from .env.test.local (never committed).
//     Without that account every test here is skipped.
//   - Localhost only: the website and backend on this laptop. The backend
//     writes to the HOSTED database, so for a few seconds the test review
//     is real and public, starting with "[test]".
//   - It cleans up after itself, even if a step fails (see afterAll).
//
// Steps run in order and share one logged-in page (describe.serial).

const EMAIL = process.env.E2E_TEST_EMAIL ?? "";
const PASSWORD = process.env.E2E_TEST_PASSWORD ?? "";
const PLACE = process.env.E2E_TEST_PLACE || "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d";
const API = "http://localhost:5000";

// One run's texts, so this run's review is easy to find, and easy to spot
// in the database if anything is ever left behind.
const STAMP = new Date().toISOString().slice(0, 16).replace("T", " ");
const REVIEW_TEXT = `[test ${STAMP}] Nami gid ang pagkaon kag maayo ang serbisyo.`;
const EDITED_TEXT = `[test ${STAMP}] Edited: nami gid, balik kami liwat!`;
const REPLY_TEXT = `[test ${STAMP}] Salamat sa tanan!`;

test.describe.serial("Real writes with the team's test account", () => {
  test.skip(!EMAIL || !PASSWORD, "No test account: fill in .env.test.local (see .env.test.example).");

  let page: Page;
  // What this run created, so afterAll can undo it if a step failed.
  let reviewId: string | null = null;
  let likedReviewId: string | null = null;

  // This run's review card, found by the id the backend gave it.
  const ownReview = () => page.locator(`#review-${reviewId}`);

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage({ baseURL: "http://localhost:3000" });
    // Same safety net as every local test: only localhost.
    await page.route((url) => !/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url.href) && !/^(data|blob):/.test(url.href), (route) =>
      route.abort("blockedbyclient"),
    );
    await page.routeWebSocket(/supabase\.co/, (ws) => ws.close());
  });

  test.afterAll(async () => {
    // Safety net: undo anything a failed step left behind, straight
    // through the backend with the test account's own login.
    const token = await page
      .evaluate(() => JSON.parse(localStorage.getItem("lakat-login") ?? "null")?.access_token as string | undefined)
      .catch(() => undefined);
    if (token) {
      const auth = { Authorization: `Bearer ${token}` };
      if (likedReviewId) await page.request.delete(`${API}/v1/reviews/${likedReviewId}/like`, { headers: auth });
      if (reviewId) await page.request.delete(`${API}/v1/reviews/${reviewId}`, { headers: auth });
    }
    await page.close();
  });

  test("logs in with the test account and goes back to the place", async () => {
    await page.goto(`/login?next=${encodeURIComponent(PLACE)}`);
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(EMAIL);
    await page.getByLabel("Password", { exact: true }).fill(PASSWORD);
    await page.getByRole("button", { name: "Log in", exact: true }).last().click();

    await expect(page).toHaveURL(new RegExp(`${PLACE}$`));
    await expect(page.getByRole("heading", { level: 2, name: "Reviews" })).toBeVisible();
    // Each traveler may review a place once. A review left by an earlier
    // run must be removed by hand first, so a real review is never deleted
    // by mistake.
    await expect(
      page.getByText("You've already reviewed this place."),
      "The test account already reviewed this place. Delete that review on the site, or set E2E_TEST_PLACE to another place.",
    ).toHaveCount(0);
  });

  test("writes a review: 4 stars and a comment", async () => {
    // Click the 4th star like a traveler: the radio button itself is
    // visually hidden (only the ★ shows), so click its label.
    await page.locator("label", { hasText: /\b4 stars,/ }).click();
    await expect(page.getByLabel(/\b4 stars,/)).toBeChecked();
    await page.getByLabel("Your review").fill(REVIEW_TEXT);

    const saved = page.waitForResponse((r) => r.url() === `${API}/v1/reviews` && r.request().method() === "POST");
    await page.getByRole("button", { name: "Post review" }).click();
    const response = await saved;
    expect(response.status(), await response.text()).toBe(201);
    reviewId = (await response.json()).id;

    await expect(page.getByRole("status").filter({ hasText: "Thanks! Your review is posted." })).toBeVisible();
    await expect(ownReview()).toContainText(REVIEW_TEXT);
    await expect(ownReview().getByRole("img", { name: "4 out of 5 stars" })).toBeVisible();
  });

  test("edits the review", async () => {
    await page.getByRole("button", { name: "Edit", exact: true }).click();
    await page.getByLabel("Your review").fill(EDITED_TEXT);
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect(ownReview()).toContainText(EDITED_TEXT);
    await expect(page.getByText(REVIEW_TEXT)).toHaveCount(0);
  });

  test("replies under the review, then deletes the reply", async () => {
    const review = ownReview();
    await review.getByRole("button", { name: "Reply", exact: true }).click();
    await review.getByLabel("Your reply").fill(REPLY_TEXT);
    await review.getByRole("button", { name: "Post reply" }).click();

    const reply = review.locator("li", { hasText: REPLY_TEXT });
    await expect(reply).toBeVisible();

    await reply.getByRole("button", { name: "Delete", exact: true }).click();
    await reply.getByRole("button", { name: "Yes, delete" }).click();

    await expect(review.getByText(REPLY_TEXT)).toHaveCount(0);
  });

  test("marks another traveler's review Helpful, then un-marks it", async () => {
    // The first review card (not a reply) by someone else that this
    // account has not marked yet. A review's own Helpful button comes
    // before any replies' buttons in its card.
    const cards = page.locator("li[id^='review-']");
    let card: Locator | null = null;
    for (let i = 0; i < (await cards.count()); i++) {
      const button = cards.nth(i).getByRole("button", { name: /^Helpful · \d+/ }).first();
      if ((await button.count()) && (await button.getAttribute("aria-pressed")) === "false") {
        card = cards.nth(i);
        break;
      }
    }
    test.skip(card === null, "No other traveler's review to mark on this place.");
    likedReviewId = ((await card!.getAttribute("id")) ?? "").replace("review-", "") || null;
    const helpful = card!.getByRole("button", { name: /^Helpful · \d+/ }).first();
    const before = Number((await helpful.textContent())?.match(/Helpful · (\d+)/)?.[1]);

    await helpful.click();
    const marked = card!.getByRole("button", { name: /^Helpful · \d+/ }).first();
    await expect(marked).toHaveAttribute("aria-pressed", "true");
    await expect(marked).toContainText(`Helpful · ${before + 1}`);

    await marked.click();
    await expect(marked).toHaveAttribute("aria-pressed", "false");
    await expect(marked).toContainText(`Helpful · ${before}`);
    likedReviewId = null; // undone
  });

  test("deletes the review", async () => {
    await page.getByRole("button", { name: "Delete", exact: true }).first().click();
    await expect(page.getByText("Delete your review? This can't be undone.")).toBeVisible();
    await page.getByRole("button", { name: "Yes, delete" }).click();

    await expect(page.getByText(EDITED_TEXT)).toHaveCount(0);
    await expect(page.getByLabel("Your review")).toBeVisible(); // the form is back
    reviewId = null; // gone, nothing to clean up
  });
});
