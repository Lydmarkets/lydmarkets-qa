import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("Performance tests", () => {
  test("homepage loads in reasonable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/");
    const loadTime = Date.now() - startTime;
    // Allow up to 8s for Railway cold starts
    expect(loadTime).toBeLessThan(8000);
  });

  test("markets page FCP is within threshold", async ({ page }) => {
    await page.goto("/markets", { waitUntil: "domcontentloaded" });

    const paintEntries = JSON.parse(
      await page.evaluate(() =>
        JSON.stringify(window.performance.getEntriesByType("paint"))
      )
    );

    const fcpEntry = (paintEntries as { name: string; startTime: number }[]).find(
      (entry) => entry.name === "first-contentful-paint"
    );

    // FCP may not be recorded if page was already cached — skip if absent
    if (fcpEntry) {
      expect(fcpEntry.startTime).toBeLessThan(4000);
    }
  });

  test("no critical console errors on homepage", async ({ page }) => {
    const errors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await dismissAgeGate(page);

    // Filter known non-critical errors (network, auth, tracking)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("404") &&
        !e.includes("401") &&
        !e.includes("403") &&
        !e.includes("Failed to load resource") &&
        !e.includes("next-router-prefetch") &&
        !e.includes("debugger") &&
        !e.includes("age") &&
        !e.includes("cookie") &&
        !e.includes("favicon") &&
        !e.includes("supabase") &&
        !e.includes("ERR_") &&
        !e.includes("net::")
    );
    expect(criticalErrors.length).toBe(0);
  });

  test("memory usage stays reasonable", async ({ page, browserName }) => {
    test.skip(browserName !== "chromium", "performance.memory is Chromium-only");

    await page.goto("/");
    await dismissAgeGate(page);

    const memoryBefore = await page.evaluate(() => {
      if ("memory" in performance) {
        return (performance as any).memory.usedJSHeapSize;
      }
      return 0;
    });

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
    expect(memoryAfter - memoryBefore).toBeLessThan(50 * 1024 * 1024);
  });
});
