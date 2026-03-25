import { defineConfig } from "@playwright/test";

const AUTH_FILE = "playwright/.auth/user.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 1,
  workers: process.env.CI ? 4 : 2,
  reporter: [
    ["json", { outputFile: "results/report.json" }],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL:
      process.env.BASE_URL || "https://web-production-bb35.up.railway.app",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
    },
    {
      name: "default",
      testMatch: /\.spec\.ts$/,
      dependencies: ["setup"],
    },
  ],
});
