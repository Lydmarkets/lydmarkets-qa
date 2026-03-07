import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: true,
  retries: 1,
  workers: 2,
  reporter: [
    ["json", { outputFile: "results/report.json" }],
    ["html", { open: "never" }],
  ],
  use: {
    baseURL: process.env.BASE_URL || "https://web-production-bb35.up.railway.app",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
