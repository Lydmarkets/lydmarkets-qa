import { test, expect } from "../fixtures/base";

test.describe("Performance tests", () => {
  test("homepage loads in reasonable time", async ({ page }) => {
    const startTime = Date.now();

    await page.goto("/", {
      waitUntil: "networkidle",
      timeout: 10000,
    });

    const loadTime = Date.now() - startTime;

    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test("markets page loads with good performance", async ({ page }) => {
    await page.goto("/markets", {
      waitUntil: "domcontentloaded",
    });

    // Check for FCP (First Contentful Paint) after navigation
    const paintEntries = JSON.parse(
      await page.evaluate(() =>
        JSON.stringify(window.performance.getEntriesByType("paint"))
      )
    );

    const fcpEntry = (paintEntries as { name: string; startTime: number }[]).find(
      (entry) => entry.name === "first-contentful-paint"
    );

    expect(fcpEntry).toBeDefined();
    expect(fcpEntry!.startTime).toBeLessThan(1800);
  });

  test("no console errors on homepage", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Should have no critical errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("404") &&
        !e.includes("next-router-prefetch") &&
        !e.includes("debugger")
    );
    expect(criticalErrors.length).toBe(0);
  });

  test("memory usage stays reasonable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "performance.memory is Chromium-only");

    await page.goto("/");
    await page.waitForLoadState("networkidle");

    const memoryBefore = await page.evaluate(() => {
      if ("memory" in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Simulate user interactions
    const marketsLink = page.getByRole("link", { name: /markets/i });
    if (await marketsLink.count()) {
      await marketsLink.first().click();
    }
    await page.waitForTimeout(1000);

    const memoryAfter = await page.evaluate(() => {
      if ("memory" in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

    // Memory growth should be reasonable (less than 50MB)
    const memoryGrowth = memoryAfter - memoryBefore;
    expect(memoryGrowth).toBeLessThan(50 * 1024 * 1024);
  });
});
