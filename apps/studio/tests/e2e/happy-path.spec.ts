import {
  expect,
  test,
} from "./fixtures";

test(
  "creator completes the deterministic demo",
  { tag: "@smoke" },
  async ({
    page,
    startDemoProject,
  }) => {
    await startDemoProject();

    await page
      .getByRole("link", {
        name: "Intent",
      })
      .click();

    await expect(
      page.getByRole("heading", {
        name: /intent contract/i,
      }),
    ).toBeVisible();

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
        /analysis complete/i,
      ),
    ).toBeVisible({
      timeout: 30_000,
    });

    await page
      .getByRole("link", {
        name: "Timeline",
      })
      .click();

    const timeline =
      page.getByRole("region", {
        name: /scrollable visual curiosity timeline/i,
      });

    await expect(timeline).toBeVisible();

    await page
      .getByRole("button", {
        name: /why does mira recognize/i,
      })
      .click();

    await expect(
      page.getByRole("dialog"),
    ).toBeVisible();

    await page
      .getByRole("radio", {
        name: /intended/i,
      })
      .check();

    await page.keyboard.press("Escape");

    await page
      .getByRole("link", {
        name: "Report",
      })
      .click();

    const downloadPromise =
      page.waitForEvent("download");

    await page
      .getByRole("button", {
        name: /export markdown/i,
      })
      .click();

    const download =
      await downloadPromise;

    expect(
      download.suggestedFilename(),
    ).toMatch(/\.md$/u);
  },
);