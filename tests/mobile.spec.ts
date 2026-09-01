import { test, expect, type Page } from "@playwright/test";
import { mintAdminSessionCookie } from "./admin-auth";

// Read-only layout checks — no login-form submissions, no writes to the
// database (this app's local/dev database is the same one production
// runs on, so that's a hard requirement, not just caution — admin pages
// are reached by injecting a session cookie directly, see admin-auth.ts).
// Runs against each mobile viewport in playwright.config.ts.
//
// The overflow/FitText/backdrop checks exist because all three failed
// silently in real use before being caught in a manual audit — none of
// them produced a console error or a broken build, just a visibly wrong
// result you'd only notice by actually looking on a phone.

async function expectNoHorizontalOverflow(page: Page) {
  const { scrollWidth, innerWidth } = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    innerWidth: window.innerWidth,
  }));
  expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
}

async function expectFitTextFits(page: Page) {
  const containers = page.getByTestId("fit-text-container");
  const count = await containers.count();

  for (let i = 0; i < count; i++) {
    const container = containers.nth(i);
    const inner = container.getByTestId("fit-text-inner");
    // FitText settles over a short window (it retries its measurement a
    // few times to outlast a font-swap race — see fit-text.tsx) — poll
    // rather than checking once immediately after navigation.
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
}

test.describe("public pages", () => {
  const PAGES = ["/", "/past-events", "/admin/login", "/this-page-does-not-exist"];

  for (const path of PAGES) {
    test(`no horizontal overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    });

    test(`FitText titles fit their container on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expectFitTextFits(page);
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

  test("About link scrolls to the About section when navigating from a different page", async ({
    page,
  }) => {
    // Regression check for a real bug: clicking "About" while already on
    // "/" worked fine (the target is already on the page), but clicking
    // it from a different page navigated to "/#about" without ever
    // actually scrolling there — the About section hadn't streamed into
    // the DOM yet by the time Next's own scroll-to-hash gave up, and it
    // never retries. See hash-scroll-fix.tsx.
    await page.goto("/past-events");
    const hamburger = page.getByRole("button", { name: "Open menu" });
    if (await hamburger.isVisible()) {
      await hamburger.click({ force: true });
    }
    await page.getByRole("link", { name: "About", exact: true }).click();

    await expect
      .poll(
        async () =>
          page.evaluate(() => {
            const el = document.getElementById("about");
            if (!el) return false;
            const r = el.getBoundingClientRect();
            return r.top < window.innerHeight && r.bottom > 0;
          }),
        { timeout: 3000 }
      )
      .toBe(true);
  });

  test("mobile menu has no Admin Dashboard link when signed out", async ({ page }) => {
    await page.goto("/");
    const hamburger = page.getByRole("button", { name: "Open menu" });
    if (!(await hamburger.isVisible())) test.skip();
    await hamburger.click({ force: true });
    await expect(page.getByRole("link", { name: /Admin Dashboard/ })).toHaveCount(0);
  });
});

test.describe("admin pages (signed in)", () => {
  const ADMIN_PAGES = ["/admin", "/admin/about", "/admin/events", "/admin/events/new"];

  test.beforeEach(async ({ context, baseURL }) => {
    const token = mintAdminSessionCookie();
    test.skip(!token, "ADMIN_PASSWORD isn't set locally — can't sign in to check admin pages.");
    await context.addCookies([{ name: "admin_session", value: token!, url: baseURL }]);
  });

  for (const path of ADMIN_PAGES) {
    test(`no horizontal overflow on ${path}`, async ({ page }) => {
      await page.goto(path);
      await expectNoHorizontalOverflow(page);
    });
  }

  test("about page's photo remove button is reachable without hover", async ({ page }) => {
    await page.goto("/admin/about");
    const removeButtons = page.getByRole("button", { name: "Remove photo" });
    const count = await removeButtons.count();
    if (count === 0) test.skip(true, "No photos currently set on /admin/about to check.");
    // Regression check for a real bug: this button used to only appear
    // on :hover, which doesn't exist on a touchscreen. `toBeVisible`
    // fails on opacity:0-and-not-hovered, which is exactly how that bug
    // looked.
    await expect(removeButtons.first()).toBeVisible();
  });

  test("mobile menu offers a way back to the dashboard when signed in", async ({ page }) => {
    await page.goto("/");
    const hamburger = page.getByRole("button", { name: "Open menu" });
    if (!(await hamburger.isVisible())) test.skip();
    await hamburger.click({ force: true });
    const link = page.getByRole("link", { name: /Admin Dashboard/ });
    await expect(link).toBeVisible();
    await link.click();
    await expect(page).toHaveURL(/\/admin$/);
  });
});
