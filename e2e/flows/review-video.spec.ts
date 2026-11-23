import { PRETEND_TRAVELER, expect, test } from "../fixtures/test";
import {
  PLACE_PATH,
  PRETEND_VIDEO_URL,
  answerReviews,
  pretendReview,
  reviewComment,
  reviewId,
  reviewerName,
} from "../fixtures/reviews";

// Tickets 165 and 166: a review's video. The login, the reviews and every
// save are PRETEND answers in the browser. No file is uploaded, and nothing
// reaches Storage or the database. The real upload is covered by the team's
// manual check on localhost.

const CANNOT_PLAY = "This video can't play in this browser.";

test.describe("A review's video", () => {
  test("a video that cannot load shows a friendly note and the review stays (pretend review)", async ({ page }) => {
    // The test's safety net blocks the pretend video's address, like a
    // network failure.
    await answerReviews(page, [pretendReview(1, { video_url: PRETEND_VIDEO_URL })]);

    await page.goto(PLACE_PATH);

    // A video loads only when it comes near the screen, so scroll to it.
    await page.getByLabel(`Video from ${reviewerName(1)}'s review`).scrollIntoViewIfNeeded();

    await expect(page.getByText(CANNOT_PLAY)).toBeVisible();
    await expect(page.getByText(reviewComment(1))).toBeVisible();
  });

  test("refuses a file that is not a video and uploads nothing (pretend login)", async ({ page, pretendLogin }) => {
    await pretendLogin();
    await answerReviews(page, []);
    const videoCalls: string[] = [];
    page.on("request", (request) => {
      if (/review-videos|\/video$/.test(request.url())) videoCalls.push(request.url());
    });
    await page.goto(PLACE_PATH);

    await page.getByLabel(/Add a video/).setInputFiles({
      name: "not-a-video.txt",
      mimeType: "text/plain",
      buffer: Buffer.from("just words"),
    });

    await expect(page.getByText("Please choose an MP4, MOV or WebM video up to 50 MB and 60 seconds.")).toBeVisible();
    expect(videoCalls).toEqual([]);
  });

  test("Keep the video cancels a removal, and nothing is deleted (pretend login)", async ({ page, pretendLogin }) => {
    await pretendLogin();
    await answerReviews(page, [pretendReview(1, { user_id: PRETEND_TRAVELER.id, video_url: PRETEND_VIDEO_URL })]);
    let deleted = false;
    await page.route(`**/api/v1/reviews/${reviewId(1)}/video`, (route) => {
      deleted = true;
      return route.fulfill({ json: { message: "The video has been removed." } });
    });
    await page.goto(PLACE_PATH);
    await page.getByRole("button", { name: "Edit", exact: true }).click();

    await page.getByRole("button", { name: /remove video/i }).click();
    await expect(page.getByText("The video will be removed when you save.")).toBeVisible();
    await page.getByRole("button", { name: "Keep the video" }).click();

    await expect(page.getByRole("button", { name: /remove video/i })).toBeVisible();
    expect(deleted).toBe(false);
  });

  test("the writer removes their video: it is deleted only on Save (pretend login and save)", async ({ page, pretendLogin }) => {
    const own = pretendReview(1, { user_id: PRETEND_TRAVELER.id, video_url: PRETEND_VIDEO_URL });
    await pretendLogin();
    await answerReviews(page, [own]);
    const calls: string[] = [];
    await page.route(`**/api/v1/reviews/${own.id}`, (route) => {
      calls.push(route.request().method());
      return route.fulfill({ json: own });
    });
    await page.route(`**/api/v1/reviews/${own.id}/video`, (route) => {
      calls.push(`${route.request().method()} video`);
      return route.fulfill({ json: { message: "The video has been removed." } });
    });
    await page.goto(PLACE_PATH);
    await page.getByRole("button", { name: "Edit", exact: true }).click();

    await page.getByRole("button", { name: /remove video/i }).click();
    expect(calls).toEqual([]);
    await page.getByRole("button", { name: "Save changes" }).click();

    await expect.poll(() => calls).toEqual(["PATCH", "DELETE video"]);
    await expect(page.getByRole("button", { name: "Save changes" })).toHaveCount(0);
    await expect(page.getByText(CANNOT_PLAY)).toHaveCount(0);
  });
});
