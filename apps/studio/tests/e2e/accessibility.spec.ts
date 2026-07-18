import AxeBuilder from "@axe-core/playwright";

import {
  expect,
  test,
} from "./fixtures";

test(
  "primary views have no automatically detectable serious violations",
  async ({
    page,
    startDemoProject,
  }) => {
    await startDemoProject();

    for (const route of [
      "script",
      "intent",
      "analyze",
      "timeline",
      "mindboard",
      "report",
    ]) {
      await page.goto(
        page.url().replace(
          /\/(script|intent|analyze|timeline|mindboard|report)$/u,
          `/${route}`,
        ),
      );

      await expect(
        page.getByRole("main"),
      ).toBeVisible();

      const result = await new AxeBuilder({
        page,
      })
        .disableRules([
          // Keep empty. A rule may be disabled only
          // through a dated ADR with manual evidence.
        ])
        .analyze();

      expect(
        result.violations.filter(
          (violation) =>
            violation.impact === "critical" ||
            violation.impact === "serious",
        ),
      ).toEqual([]);
    }
  },
);