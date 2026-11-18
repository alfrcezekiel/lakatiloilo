import { PRETEND_TRAVELER, expect, pretendSession, test } from "../fixtures/test";

// Logging in and getting to the review form. Every login here is PRETEND:
// the backend's answer to POST /v1/auth/login is replaced in the browser,
// so no real account, email or password is ever used.

const BREAKTHROUGH = "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d";

test.describe("Logged out", () => {
  test("a place page asks the traveler to log in to write a review, and remembers the page", async ({ page }) => {
    await page.goto(BREAKTHROUGH);

    const logIn = page.getByRole("link", { name: "Log in to write a review" });
    await expect(logIn).toHaveAttribute("href", `/login?next=${encodeURIComponent(BREAKTHROUGH)}`);

    await logIn.click();

    await expect(page.getByRole("heading", { level: 1 })).toHaveText("Welcome back, lakat.");
  });
});

test.describe("The login form (pretend backend answers)", () => {
  test("asks for an email and a password before sending anything", async ({ page }) => {
    let sent = false;
    await page.route("**/v1/auth/login", (route) => {
      sent = true;
      return route.abort();
    });
    await page.goto("/login");

    await page.getByRole("button", { name: "Log in", exact: true }).last().click();

    await expect(page.getByText("Please enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Please enter your password.")).toBeVisible();
    expect(sent).toBe(false);
  });

  test('shows "Wrong email or password." when the backend refuses (pretend answer)', async ({ page }) => {
    await page.route("**/v1/auth/login", (route) =>
      route.fulfill({ status: 400, json: { statusCode: 400, code: "invalid_credentials", message: "Invalid login credentials" } }),
    );
    await page.goto("/login");

    await page.getByRole("textbox", { name: "Email", exact: true }).fill("juan@example.test");
    await page.getByLabel("Password", { exact: true }).fill("not-the-password");
    await page.getByRole("button", { name: "Log in", exact: true }).last().click();

    await expect(page.getByText("Wrong email or password.")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("asks the traveler to wait after too many tries (pretend answer)", async ({ page }) => {
    await page.route("**/v1/auth/login", (route) =>
      route.fulfill({ status: 429, json: { statusCode: 429, message: "Too many requests" } }),
    );
    await page.goto("/login");

    await page.getByRole("textbox", { name: "Email", exact: true }).fill("juan@example.test");
    await page.getByLabel("Password", { exact: true }).fill("still-wrong");
    await page.getByRole("button", { name: "Log in", exact: true }).last().click();

    await expect(page.getByText("Too many tries. Please wait a few minutes and try again.")).toBeVisible();
  });

  test("a successful login goes back to the place, ready to write a review (pretend answer)", async ({ page, pretendLogin }) => {
    await pretendLogin({ alreadyLoggedIn: false }); // pretend answers only; starts logged out
    await page.route("**/v1/auth/login", (route) => route.fulfill({ json: { session: pretendSession() } }));
    await page.goto(`/login?next=${encodeURIComponent(BREAKTHROUGH)}`);

    await page.getByRole("textbox", { name: "Email", exact: true }).fill(PRETEND_TRAVELER.email);
    await page.getByLabel("Password", { exact: true }).fill("pretend-password");
    await page.getByRole("button", { name: "Log in", exact: true }).last().click();

    await expect(page).toHaveURL(new RegExp(`${BREAKTHROUGH}$`));
    await expect(page.getByRole("group", { name: "Your rating" })).toBeVisible();
    await expect(page.getByLabel("Your review")).toBeVisible();
  });
});

test.describe("Logged in (pretend login)", () => {
  test("the review form refuses an empty review before sending it", async ({ page, pretendLogin }) => {
    await pretendLogin();
    let sent = false;
    await page.route("**/v1/reviews", (route) => {
      if (route.request().method() === "POST") {
        sent = true;
        return route.abort();
      }
      return route.fallback();
    });
    await page.goto(BREAKTHROUGH);

    await page.getByRole("button", { name: "Post review" }).click();

    await expect(page.getByText("Please pick 1 to 5 stars.")).toBeVisible();
    await expect(page.getByText("Please write a few words about your visit.")).toBeVisible();
    expect(sent).toBe(false);
  });

  test("stars can be chosen with the keyboard", async ({ page, pretendLogin }) => {
    await pretendLogin();
    await page.goto(BREAKTHROUGH);
    const third = page.getByRole("radio", { name: "3 stars, Good" });

    await third.focus();
    await page.keyboard.press("ArrowRight");

    await expect(page.getByRole("radio", { name: "4 stars, Very good" })).toBeChecked();
  });
});
