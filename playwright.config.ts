import { defineConfig } from "@playwright/test";

const AUTH_FILE = "playwright/.auth/user.json";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  // The bot build (Railway, modest resources) is slow and variable under
  // concurrent load, so timing-sensitive tests flake run-to-run. Give the whole
  // suite generous headroom + an extra retry in CI/nightly rather than hand-
  // tuning per-test timeouts (which just moves the flake to the next cluster).
  retries: process.env.CI ? 2 : 1,
  workers: process.env.CI ? 4 : 2,
  timeout: 60_000, // per-test (default 30s)
  expect: { timeout: 10_000 }, // per-assertion (default 5s)
  reporter: [
    ["json", { outputFile: "results/report.json" }],
    ["html", { open: "never" }],
  ],
  use: {
    // Default to the bot legislation build: email/password auth (no BankID),
    // so the full authenticated suite can register + run unattended.
    baseURL:
      process.env.BASE_URL || "https://web-bot-production-518c.up.railway.app",
    actionTimeout: 15_000, // default 0 (= test timeout); cap clicks/fills explicitly
    navigationTimeout: 45_000, // default 30s; the bot build's first paint is slow
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
