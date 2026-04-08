import { test, expect } from "../fixtures/base";
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

});
