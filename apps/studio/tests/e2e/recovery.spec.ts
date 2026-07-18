import {
  expect,
  test,
} from "./fixtures";

test(
  "a run resumes after refresh without duplicate operations",
  async ({
    page,
    context,
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
        name: /run fixture analysis/i,
      })
      .click();

    await expect(
      page.getByText(
        /2 of \d+ segments committed/i,
      ),
    ).toBeVisible();

    await page.reload();

    await expect(
      page.getByRole("button", {
        name: /resume analysis/i,
      }),
    ).toBeVisible();

    await page
      .getByRole("button", {
        name: /resume analysis/i,
      })
      .click();

    await expect(
      page.getByText(
        /analysis complete/i,
      ),
    ).toBeVisible();

    const newPage = await context.newPage();
    await newPage.goto(page.url());

    await expect(
      newPage.getByText(
        /another tab/i,
      ),
    ).toBeVisible();

    await page
      .getByRole("link", {
        name: "Proof",
      })
      .click();

    await expect(
      page.getByText(
        /duplicate operations/i,
      ),
    ).toHaveText(/0/u);
  },
);