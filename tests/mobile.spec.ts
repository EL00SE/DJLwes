import { test, expect } from "@playwright/test";

// Read-only layout checks — no login, no form submissions, nothing that
// writes to the database (this app's local/dev database is the same one
// production runs on, so that's a hard requirement, not just caution).
// Runs against each mobile viewport in playwright.config.ts.
//
// These three checks exist because all three failed silently in real
// use before being caught in a manual audit: a long past-event title
// overflowed off the edge of the screen, and the mobile menu's dimming
// backdrop only ever covered the header bar instead of the whole page.
// Neither produced a console error or a broken build — just a visibly
// wrong result you'd only notice by actually looking on a phone.

const PAGES = ["/", "/past-events"];

for (const path of PAGES) {
  test(`no horizontal overflow on ${path}`, async ({ page }) => {
    await page.goto(path);
    const { scrollWidth, innerWidth } = await page.evaluate(() => ({
      scrollWidth: document.documentElement.scrollWidth,
      innerWidth: window.innerWidth,
    }));
    expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
  });

  test(`FitText titles fit their container on ${path}`, async ({ page }) => {
    await page.goto(path);
    const containers = page.getByTestId("fit-text-container");
    const count = await containers.count();

    for (let i = 0; i < count; i++) {
      const container = containers.nth(i);
      const inner = container.getByTestId("fit-text-inner");
      // FitText settles over a short window (it retries its measurement
      // a few times to outlast a font-swap race — see fit-text.tsx) —
      // poll rather than checking once immediately after navigation.
      await expect
        .poll(
          async () => {
            const [containerBox, innerBox] = await Promise.all([container.boundingBox(), inner.boundingBox()]);
            if (!containerBox || !innerBox) return 0;
            return innerBox.width - containerBox.width;
          },
          { timeout: 2000 }
        )
        // +1px tolerance for sub-pixel rounding between the two measurements.
        .toBeLessThanOrEqual(1);
    }
  });
}

test("mobile menu backdrop dims the whole page, not just the header", async ({ page }) => {
  await page.goto("/");
  const hamburger = page.getByRole("button", { name: "Open menu" });

  // Only present below the `sm:` breakpoint — skip on any project wide
  // enough to show the full desktop nav instead.
  if (!(await hamburger.isVisible())) test.skip();

  await hamburger.click();

  const backdrop = page.locator('button[aria-label="Close menu"].fixed.inset-0');
  await expect(backdrop).toHaveCSS("opacity", "1");

  const box = await backdrop.boundingBox();
  const viewport = page.viewportSize();
  expect(box).not.toBeNull();
  expect(viewport).not.toBeNull();
  expect(box!.width).toBeCloseTo(viewport!.width, 0);
  expect(box!.height).toBeCloseTo(viewport!.height, 0);
});
