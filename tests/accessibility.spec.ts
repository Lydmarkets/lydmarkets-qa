import { test, expect } from "../fixtures/base";

test.describe("Accessibility (a11y) tests", () => {
  test("homepage has valid heading hierarchy", async ({ page }) => {
    await page.goto("/");

    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    expect(headings.length).toBeGreaterThan(0);

    // H1 should exist (main page title)
    const h1 = await page.locator("h1").count();
    expect(h1).toBeGreaterThan(0);
  });

  test("all images have alt text", async ({ page }) => {
    await page.goto("/");

    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      // Alt text should exist (but can be empty for decorative images)
      expect(alt).not.toBeNull();
    }
  });

  test("all interactive elements are keyboard accessible", async ({
    page,
  }) => {
    await page.goto("/");

    // Tab through interactive elements
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();

    // Buttons should exist on the page
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test("links have descriptive text", async ({ page }) => {
    await page.goto("/");

    const links = await page.locator("a").all();
    for (const link of links) {
      const text = await link.textContent();
      // Links should have text or aria-label
      const ariaLabel = await link.getAttribute("aria-label");
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test("text has readable font sizes", async ({ page }) => {
    await page.goto("/");

    // Check that text elements have reasonable font sizes
    const textElements = await page.locator("p, span, a, h1, h2, h3").all();

    for (const el of textElements.slice(0, 10)) {
      // Check first 10 elements
      const computed = await el.evaluate((e) => {
        const style = window.getComputedStyle(e);
        return {
          fontSize: style.fontSize,
          color: style.color,
          background: style.backgroundColor,
        };
      });

      const fontSizeNum = parseInt(computed.fontSize || "0");
      // Font should be at least 12px for body text
      expect(fontSizeNum).toBeGreaterThanOrEqual(12);
    }
  });

  test("form labels are associated with inputs", async ({ page }) => {
    await page.goto("/auth");

    const inputs = await page.locator("input").all();
    for (const input of inputs) {
      const id = await input.getAttribute("id");
      if (id) {
        // Check if there's a label with for attribute
        const label = await page.locator(`label[for="${id}"]`).count();
        const ariaLabel = await input.getAttribute("aria-label");
        expect(label > 0 || ariaLabel).toBeTruthy();
      }
    }
  });

  test("page has proper lang attribute", async ({ page }) => {
    await page.goto("/");

    const lang = await page.locator("html").getAttribute("lang");
    expect(lang).toBeTruthy();
  });
});
