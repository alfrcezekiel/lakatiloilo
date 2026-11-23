import base from "./playwright.config";

// The same tests, using the Google Chrome already installed on this computer
// instead of the browsers Playwright downloads with `npx playwright install`.
//
//   npm run test:e2e:chrome
//
// Everything else (tests, screen sizes, timeouts, reports) comes from
// playwright.config.ts.
const config = {
  ...base,
  projects: base.projects?.map((project) => ({
    ...project,
    use: { ...project.use, channel: "chrome" },
  })),
};

export default config;
