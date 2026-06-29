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
    // Default to the bot legislation build: email/password auth (no BankID),
    // so the full authenticated suite can register + run unattended.
    baseURL:
      process.env.BASE_URL || "https://web-bot-production-518c.up.railway.app",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
  projects: [
    {
      name: "setup",
      testMatch: /auth\.setup\.ts/,
      // Generous: the bot service can cold-start on the first hit of a run.
      timeout: 120_000,
      retries: 2,
    },
    {
      name: "default",
      testMatch: /\.spec\.ts$/,
      dependencies: ["setup"],
    },
  ],
});
