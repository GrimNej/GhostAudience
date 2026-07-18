import { expect, test } from "./fixtures";

test("a completed run survives refresh without duplicate operations", async ({
  page,
  startDemoProject,
}) => {
  await startDemoProject();

  await page
    .getByRole("link", {
      name: "Analyze",
    })
    .click();

  await page
    .getByRole("button", {
      name: /run reliable demo/i,
    })
    .click();

  await expect(page.getByText(/analysis status completed/i)).toBeVisible();

  await page.reload({ waitUntil: "commit" });
  await expect(page.getByText(/analysis status completed/i)).toBeVisible();

  await page
    .getByRole("link", {
      name: "Proof",
    })
    .click();

  await expect(
    page
      .locator("article.metric-card")
      .filter({ hasText: "Duplicate operations" })
      .locator(".metric-card__value"),
  ).toHaveText("0");
});
