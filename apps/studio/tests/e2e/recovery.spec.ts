import { expect, test } from "./fixtures";

test("a completed audience read survives refresh without duplicate operations", async ({
  page,
  startDemoProject,
}) => {
  await startDemoProject();
  await page.getByRole("button", { name: /start audience analysis/i }).click();
  await expect(page.getByText(/audience read complete/i)).toBeVisible();

  await page.reload({ waitUntil: "commit" });
  await expect(page.getByText(/audience read complete/i)).toBeVisible();

  await page.getByRole("link", { name: "Method" }).click();
  await expect(
    page
      .locator("article.metric-card")
      .filter({ hasText: "Duplicate operations" })
      .locator(".metric-card__value"),
  ).toHaveText("0");
});
