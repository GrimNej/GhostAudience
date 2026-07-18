import {
  expect,
  test as base,
  type Page,
} from "@playwright/test";

interface AppFixtures {
  readonly startDemoProject:
    () => Promise<void>;
}

async function waitForWorkspace(
  page: Page,
): Promise<void> {
  await page.goto("/");
  await expect(
    page.getByRole("main"),
  ).toBeVisible();
}

export const test = base.extend<AppFixtures>({
  startDemoProject: async (
    { page },
    use,
  ) => {
    await use(async () => {
      await waitForWorkspace(page);
      await page
        .getByRole("button", {
          name: /try the demo/i,
        })
        .click();
      await expect(
        page.getByRole("heading", {
          name: /demo/i,
        }),
      ).toBeVisible();
    });
  },
});

export { expect };