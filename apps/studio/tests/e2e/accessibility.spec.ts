import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "./fixtures";

async function expectNoSeriousViolations(page: import("@playwright/test").Page) {
  await expect(page.getByRole("main")).toBeVisible();
  const result = await new AxeBuilder({ page }).analyze();
  expect(
    result.violations.filter(
      (violation) => violation.impact === "critical" || violation.impact === "serious",
    ),
  ).toEqual([]);
}

test("primary views have no automatically detectable serious violations", async ({
  page,
  startDemoProject,
}) => {
  await page.goto("/");
  await expectNoSeriousViolations(page);

  await startDemoProject();
  await expectNoSeriousViolations(page);

  await page.getByRole("link", { name: "Content", exact: true }).click();
  await expectNoSeriousViolations(page);

  await page.getByRole("link", { name: "Analysis", exact: true }).click();
  await page.getByRole("button", { name: /start audience analysis/i }).click();
  await expect(page.getByText(/audience read complete/i)).toBeVisible();
  await expectNoSeriousViolations(page);

  await page.getByRole("button", { name: /questions \(/i }).click();
  await expectNoSeriousViolations(page);

  await page.getByRole("button", { name: /what they understood/i }).click();
  await expectNoSeriousViolations(page);
});
