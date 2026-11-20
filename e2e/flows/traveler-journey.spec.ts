import { PRETEND_TRAVELER, expect, pretendSession, test } from "../fixtures/test";

// A traveler's whole visit, from the home page to a posted review, in one
// go: search → open a place → log in → come back → write a review → see it.
// The other flow files test each step on its own; this one proves the steps
// still join up.
//
// PRETEND login and PRETEND save: the backend's answers to the log-in and
// to "post this review" are replaced in the browser, so nothing is saved
// and no real account is used. Public reads (places, reviews) come from the
// team's running backend through the website's /api (ticket 152).

const PRETEND_REVIEW_ID = "22222222-2222-4222-8222-222222222222";
// ñ and an accent, the way Ilonggo travelers write.
const COMMENT = "  Nami gid ang batchoy, Señor! Balik kami sa café.  ";

test.describe("A traveler's whole visit", () => {
  test("finds a place, logs in, posts a review and sees it on the page (pretend login and pretend save)", async ({
    page,
    pretendLogin,
  }) => {
    // Arrange: pretend answers for the login and the save.
    await pretendLogin({ alreadyLoggedIn: false });
    await page.route("**/api/v1/auth/login", (route) => route.fulfill({ json: { session: pretendSession() } }));

    let posted: { url: string; authorization?: string; body: Record<string, unknown> } | null = null;
    await page.route("**/api/v1/reviews", (route) => {
      const request = route.request();
      if (request.method() !== "POST") return route.fallback();
      const body = request.postDataJSON() as Record<string, unknown>;
      posted = { url: request.url(), authorization: request.headers().authorization, body };
      return route.fulfill({
        status: 201,
        json: {
          id: PRETEND_REVIEW_ID,
          user_id: PRETEND_TRAVELER.id,
          reviewer_name: PRETEND_TRAVELER.display_name,
          traveler_type: PRETEND_TRAVELER.traveler_type,
          rating: body.rating,
          comment: body.comment,
          created_at: new Date().toISOString(),
        },
      });
    });

    // 1. Search from the home page.
    await page.goto("/");
    const search = page.getByRole("combobox", { name: "Where to?" });
    await search.fill("La Paz Batchoy");
    await expect(page.getByRole("option").first()).toBeVisible();
    await search.press("Enter");

    // 2. The place page.
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("La Paz Batchoy");
    await expect(page.getByRole("heading", { level: 2, name: "Reviews" })).toBeVisible();
    const placePath = new URL(page.url()).pathname;
    const placeId = placePath.split("/").pop();

    // 3. Log in, and come back to the same place.
    await page.getByRole("link", { name: "Log in to write a review" }).click();
    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back, lakat.");
    await page.getByRole("textbox", { name: "Email", exact: true }).fill(PRETEND_TRAVELER.email);
    await page.getByLabel("Password", { exact: true }).fill("pretend-password");
    await page.getByRole("button", { name: "Log in", exact: true }).last().click();
    await expect(page).toHaveURL(new RegExp(`${placePath}$`));

    // 4. Write the review: 5 stars (click the star's label, as a traveler
    //    does; the radio button itself is visually hidden) and a comment.
    await page.locator("label", { hasText: /\b5 stars,/ }).click();
    await expect(page.getByLabel(/\b5 stars,/)).toBeChecked();
    await page.getByLabel("Your review").fill(COMMENT);

    // Act
    await page.getByRole("button", { name: "Post review" }).click();

    // Assert: the traveler sees it at once...
    await expect(page.getByRole("status").filter({ hasText: "Thanks! Your review is posted." })).toBeVisible();
    const card = page.locator(`#review-${PRETEND_REVIEW_ID}`);
    await expect(card).toContainText(COMMENT.trim());
    await expect(card.getByRole("img", { name: "5 out of 5 stars" })).toBeVisible();

    // ...and what was sent is right: through the website's own /api, with
    // the login, the trimmed words, and nothing that says who owns it (the
    // backend decides that from the login).
    expect(posted, "the review was never sent").not.toBeNull();
    const sent = posted!;
    expect(sent.url).toBe(`${test.info().project.use.baseURL}/api/v1/reviews`);
    expect(sent.authorization).toMatch(/^Bearer .+\.pretend$/);
    expect(sent.body).toEqual({
      place_type: "destination",
      place_id: placeId,
      rating: 5,
      comment: COMMENT.trim(),
    });
  });
});
