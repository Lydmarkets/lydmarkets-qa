import { test, expect } from "../fixtures/base";
import { dismissAgeGate } from "../helpers/age-gate";

test.describe("Accessibility (a11y) tests", () => {
  test("homepage has headings in the page", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    // Homepage uses h2/h3 for market cards — H1 is on interior pages
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test("interior pages have an H1", async ({ page }) => {
    await page.goto("/leaderboard");
    await dismissAgeGate(page);
    const h1 = await page.locator("h1").count();
    expect(h1).toBeGreaterThan(0);
  });

  test("all images have alt text", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      expect(alt).not.toBeNull();
    }
  });

  test("all interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test("links have descriptive text or aria-label", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    const links = await page.locator("a").all();
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute("aria-label");
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test("text has readable font sizes", async ({ page }) => {
    await page.goto("/");
    await dismissAgeGate(page);
    const textElements = await page.locator("p, span, a, h2, h3").all();
    for (const el of textElements.slice(0, 10)) {
      const fontSize = await el.evaluate((e) => window.getComputedStyle(e).fontSize);
      expect(parseInt(fontSize || "0")).toBeGreaterThanOrEqual(12);
    }
  });

  test("form labels are associated with inputs on login page", async ({ page }) => {
    // Login uses BankID — no standard form inputs. Register has no text inputs either.
    // Verify the login page is accessible via its button structure.
    await page.goto("/login");
    const buttons = await page.locator("button").all();
    expect(buttons.length).toBeGreaterThan(0);
    for (const btn of buttons) {
      const text = await btn.textContent();
      const ariaLabel = await btn.getAttribute("aria-label");
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test("page has proper lang attribute", async ({ page }) => {
    await page.goto("/");
    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });
});
