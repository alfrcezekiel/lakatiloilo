import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "../fixtures/test";

// Automatic accessibility check (axe-core) against WCAG 2.2 level AA, the
// level the evaluations use. axe finds roughly a third of problems: the
// keyboard and screen-reader passes in /evaluate-app are still needed.

const PAGES = [
  ["Home", "/"],
  ["A place page", "/destinations/5d1155a1-6e40-417d-9c84-09a990cae00d"],
  ["Place not found", "/destinations/99999999-9999-4999-8999-999999999999"],
  ["Log in", "/login"],
  ["Forgot password", "/forgot-password"],
] as const;

test.describe("Accessibility (axe, WCAG 2.2 AA)", () => {
  for (const [name, path] of PAGES) {
    test(`${name} (${path}) has no WCAG A/AA problems axe can find`, async ({ page }) => {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
      // Let entrance animations finish, so colours are measured at rest.
      await page.waitForTimeout(800);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
        .analyze();

      // One line per element, so a failure says what, where and why (for
      // colour contrast, axe's message includes the measured ratio).
      const problems = results.violations.flatMap((v) =>
        v.nodes.map(
          (n) =>
            `${v.impact} · ${v.id} · ${n.target.join(" ")}\n    ${n.html.slice(0, 140)}\n    ${(n.any[0] ?? n.all[0] ?? n.none[0])?.message ?? v.help}`,
        ),
      );
      expect(problems, problems.join("\n")).toEqual([]);
    });
  }
});
