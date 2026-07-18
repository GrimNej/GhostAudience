import { defineConfig, devices } from "@playwright/test";

const baseURL = process.env["PLAYWRIGHT_BASE_URL"] ?? "http://127.0.0.1:4173";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env["CI"]),
  retries: process.env["CI"] ? 2 : 0,
  workers: process.env["CI"] ? 1 : 4,
  timeout: 45_000,
  expect: {
    timeout: 8_000,
  },
  reporter: process.env["CI"]
    ? [
        ["line"],
        [
          "html",
          {
            open: "never",
            outputFolder: "playwright-report",
          },
        ],
      ]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
    serviceWorkers: "block",
    actionTimeout: 10_000,
    navigationTimeout: 20_000,
    contextOptions: {
      reducedMotion: "reduce",
    },
  },
  webServer: {
    command: "pnpm preview:test",
    url: baseURL,
    reuseExistingServer: !process.env["CI"],
    timeout: 120_000,
  },
  projects: [
    {
      name: "chromium-desktop",
      use: {
        ...devices["Desktop Chrome"],
      },
    },
    {
      name: "firefox-desktop",
      use: {
        ...devices["Desktop Firefox"],
      },
    },
    {
      name: "webkit-desktop",
      use: {
        ...devices["Desktop Safari"],
      },
    },
    {
      name: "mobile-chromium",
      use: {
        ...devices["Pixel 7"],
      },
    },
  ],
});
