import { test as base, expect, type Page } from "@playwright/test";

// The `test` every local Playwright file uses (import it from here, not
// from "@playwright/test"). It adds two safety nets:
//
// 1. Only localhost. Every request to any other address (Supabase, photo
//    sites, fonts) is stopped before it leaves the browser, and Supabase's
//    live-update connection is closed. So a test can never read from or
//    write to the hosted project directly, and the results do not depend
//    on the internet. The website still talks to the team's local backend
//    on :5000 for public reads.
//
// 2. `pretendLogin`: a made-up login (see below). Never a real account or
//    password (.claude/rules/working-with-the-team.md).
//
// (Playwright's examples call the second fixture argument `use`. Here it is
// `provide`, because React's linter treats anything named use… as a hook.)

const isLocal = (url: string) => /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url) || /^(data|blob):/.test(url);

// A pretend traveler. None of these exist in the hosted project.
export const PRETEND_TRAVELER = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "juan@example.test",
  display_name: "Juan dela Cruz",
  traveler_type: "local",
  is_admin: false,
};

// A pretend login token that runs out in an hour. It is never checked by
// anything real: every request that carries it is answered below.
const pretendToken = () => {
  const part = (o: object) => Buffer.from(JSON.stringify(o)).toString("base64url");
  const exp = Math.floor(Date.now() / 1000) + 3600;
  return `${part({ alg: "none" })}.${part({ sub: PRETEND_TRAVELER.id, exp })}.pretend`;
};

export const pretendSession = () => ({
  access_token: pretendToken(),
  refresh_token: "pretend-refresh",
  expires_at: Math.floor(Date.now() / 1000) + 3600,
});

// Answers every backend request that carries the pretend login, so it never
// reaches the real backend (which would ask Supabase about a made-up token).
async function answerAsPretendTraveler(page: Page) {
  // Any other request to the real local backend (through the website's
  // /api proxy, ticket 152) goes on WITHOUT the pretend
  // token (so the backend treats it as logged out and never asks Supabase
  // about a made-up token). Registered first: Playwright tries the routes
  // added later first, so the specific answers below win.
  await page.route("**/api/v1/**", (route) => {
    const headers = { ...route.request().headers() };
    delete headers.authorization;
    return route.continue({ headers });
  });
  await page.route("**/v1/auth/me", (route) => route.fulfill({ json: PRETEND_TRAVELER }));
  await page.route("**/v1/notifications", (route) => route.fulfill({ json: { notifications: [], unread_count: 0 } }));
  await page.route("**/v1/auth/refresh", (route) => route.fulfill({ json: { session: pretendSession() } }));
  await page.route("**/v1/auth/logout", (route) => route.fulfill({ json: { message: "Logged out." } }));
}

export const test = base.extend<{
  onlyLocalhost: void;
  pretendLogin: (options?: { alreadyLoggedIn?: boolean }) => Promise<void>;
}>({
  onlyLocalhost: [
    async ({ page }, provide) => {
      await page.route(
        (url) => !isLocal(url.href),
        (route) => route.abort("blockedbyclient"),
      );
      await page.routeWebSocket(/supabase\.co/, (ws) => ws.close());
      await provide();
    },
    { auto: true },
  ],

  // Logs the browser in as PRETEND_TRAVELER without any real account: the
  // pretend session goes where the app keeps its login (localStorage), and
  // the backend's "who is this?" answers are pretend too.
  // { alreadyLoggedIn: false }: only the pretend answers, so the browser
  // starts logged out (for testing the login form itself).
  pretendLogin: async ({ page }, provide) => {
    await provide(async ({ alreadyLoggedIn = true } = {}) => {
      await answerAsPretendTraveler(page);
      if (!alreadyLoggedIn) return;
      const session = pretendSession();
      await page.addInitScript((saved) => {
        localStorage.setItem("lakat-login", JSON.stringify(saved));
      }, session);
    });
  },
});

export { expect };
