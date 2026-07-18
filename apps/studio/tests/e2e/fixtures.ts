import { test as base, expect, type Page } from "@playwright/test";

interface AppFixtures {
  readonly startDemoProject: () => Promise<void>;
}

async function waitForWorkspace(page: Page): Promise<void> {
  await page.goto("/");
  await expect(page.getByRole("main")).toBeVisible();
}

export const test = base.extend<AppFixtures>({
  startDemoProject: async ({ page }, use) => {
    await use(async () => {
      await waitForWorkspace(page);
      await page
        .getByRole("link", {
          name: /explore a sample/i,
        })
        .click();
      await expect(
        page.getByRole("heading", {
          name: /your draft is ready for its first audience/i,
        }),
      ).toBeVisible();
    });
  },
});

export { expect };
