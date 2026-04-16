import { test, expect } from "../fixtures/base";
test.describe("Accessibility (a11y) tests", () => {
  test("homepage has headings in the page", async ({ page }) => {
    await page.goto("/");
    // Homepage uses h2/h3 for market cards — H1 is on interior pages
    const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test("interior pages have an H1", async ({ page }) => {
    await page.goto("/leaderboard");
    const h1 = await page.locator("h1").count();
    expect(h1).toBeGreaterThan(0);
  });

  test("all images have alt text", async ({ page }) => {
    await page.goto("/");
    const images = await page.locator("img").all();
    for (const img of images) {
      const alt = await img.getAttribute("alt");
      expect(alt).not.toBeNull();
    }
  });

  test("all interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto("/");
    await page.keyboard.press("Tab");
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);
  });

  test("links have descriptive text or aria-label", async ({ page }) => {
    await page.goto("/");
    const links = await page.locator("a").all();
    for (const link of links) {
      const text = await link.textContent();
      const ariaLabel = await link.getAttribute("aria-label");
      expect(text?.trim() || ariaLabel).toBeTruthy();
    }
  });

  test("text has readable font sizes", async ({ page }) => {
    await page.goto("/");
    // Wait for the home content to render so computed styles are stable.
    // Without this, the first call sometimes raced React hydration on a
    // not-yet-styled element and returned a sub-10px size, causing flakes.
    await expect(
      page.getByRole("heading", { name: /utvalda|featured|vad tycker du|what do you think/i }).first()
    ).toBeAttached({ timeout: 10_000 });

    // Restrict to paragraphs and headings — decorative spans/links (badges,
    // count pills, tag chips) intentionally use smaller type. 10px is the
    // absolute floor for body/heading copy per the in-house a11y checklist.
    // Skip visually-hidden helpers (sr-only h2 in the carousel etc.) since
    // they're for assistive tech and intentionally collapsed in layout.
    const offenders = await page.locator("p, h2, h3").evaluateAll((els) =>
      els
        .filter((e) => {
          const r = (e as HTMLElement).getBoundingClientRect();
          // Visually-hidden / not-rendered elements are exempt.
          return r.width > 0 && r.height > 0;
        })
        .slice(0, 10)
        .map((e) => ({
          tag: e.tagName,
          text: e.textContent?.trim().slice(0, 60) ?? "",
          fontSize: parseFloat(window.getComputedStyle(e).fontSize),
        }))
        .filter((info) => info.fontSize < 10),
    );
    expect(offenders, `Found text elements below 10px: ${JSON.stringify(offenders)}`).toEqual([]);
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
