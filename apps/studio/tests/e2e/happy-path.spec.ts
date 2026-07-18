import { expect, test } from "./fixtures";

test("creator completes the three-step sample journey", { tag: "@smoke" }, async ({
  page,
  startDemoProject,
}) => {
  await startDemoProject();

  await page.getByRole("button", { name: /start audience analysis/i }).click();

  await expect(
    page.getByRole("heading", {
      name: /here is what your audience is carrying/i,
    }),
  ).toBeVisible({ timeout: 30_000 });
  await expect(page).toHaveURL(/\/results/u);

  await page
    .getByRole("button", {
      name: /who does .*she.* refer to/i,
    })
    .click();

  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.getByRole("heading", { name: /evidence/i })).toBeVisible();

  await page.getByRole("radio", { name: /intended/i }).check();
  await expect(page.getByRole("radio", { name: /intended/i })).toBeChecked();

  await page.keyboard.press("Escape");
  await expect(page.getByRole("dialog")).toBeHidden();

  await page.getByRole("button", { name: /story journey/i }).click();
  await expect(
    page.getByRole("region", {
      name: /scrollable visual curiosity timeline/i,
    }),
  ).toBeVisible();

  const downloadPromise = page.waitForEvent("download");
  await page.getByRole("button", { name: /markdown/i }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/\.md$/u);
});
