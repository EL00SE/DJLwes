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

  // Below `lg:` the hero stacks title, photo, buy button, description,
  // details — the photo used to sit at the very bottom of the hero's text.
  test("hero stacks title, photo, buy button, then description on mobile", async ({ page }) => {
    await page.goto("/");
    const isDesktop = await page.evaluate(() => window.matchMedia("(min-width: 1024px)").matches);
    if (isDesktop) test.skip();

    const tops = await page.evaluate(() => {
      const docTop = (el: Element | null) =>
        el ? el.getBoundingClientRect().top + window.scrollY : null;
      const hero = document.querySelector("main section");
      return {
        title: docTop(hero?.querySelector("h1") ?? null),
        photo: docTop(hero?.querySelector("img") ?? null),
        buy: docTop(
          hero?.querySelector('a[href^="http"], button[disabled]') ?? null
        ),
        description: docTop(hero?.querySelector("p.whitespace-pre-line") ?? null),
      };
    });

    expect(tops.title).not.toBeNull();
    expect(tops.photo!).toBeGreaterThan(tops.title!);
    expect(tops.buy!).toBeGreaterThan(tops.photo!);
    expect(tops.description!).toBeGreaterThan(tops.buy!);
  });

  // The hero's Buy Tickets button sticks to the top of the screen once it
  // scrolls up there, and drops back into place on the way back up. It's
  // really two identical buttons trading places (the real one and a fixed
  // twin), so the checks are that they trade at the right moment, match
  // in size, and that only one is ever showing. Only below `lg:`.
  test("buy button sticks to the top as the same button, and releases on the way back", async ({
    page,
  }) => {
    await page.goto("/");
    const isDesktop = await page.evaluate(() => window.matchMedia("(min-width: 1024px)").matches);
    if (isDesktop) test.skip();

    // Let the page-enter animation finish first: while it runs the page
    // wrapper has a transform, which anchors position:fixed to the page
    // instead of the screen. What matters (and what a real visitor
    // scrolling after the first half second sees) is that it lets go
    // afterwards — an animation fill-mode of `both` kept it forever.
    await page.evaluate(() =>
      Promise.all(
        document
          .getAnimations()
          // The Buy button's glow pulse loops forever and never "finishes".
          .filter((a) => a.effect?.getComputedTiming().iterations !== Infinity)
          .map((a) => a.finished)
      )
    );

    const original = page.getByTestId("buy-original").locator("a, button");
    const pinned = page.getByTestId("buy-pinned");
    const pinnedButton = pinned.locator("a, button");

    // Scrolls so the real button's top edge sits `topPx` from the top of
    // the screen (its layout box is measurable even while it's hidden).
    const originalDocTop = await original.evaluate((el) => el.getBoundingClientRect().top + window.scrollY);
    const scrollOriginalTo = (topPx: number) =>
      page.evaluate((y) => window.scrollTo(0, y), originalDocTop - topPx);

    // Before it reaches the top: the real button shows, the twin doesn't.
    await expect(pinned).toBeHidden();
    await expect(original).toBeVisible();
    await scrollOriginalTo(60);
    await expect(pinned).toBeHidden();
    await expect(original).toBeVisible();

    // Just short of the pin line (12px): still the real one.
    await scrollOriginalTo(20);
    await expect(pinned).toBeHidden();
    await expect(original).toBeVisible();

    // Reached it: the twin takes over, in the same spot...
    await scrollOriginalTo(4);
    await expect(pinned).toBeVisible();
    await expect(original).toHaveCSS("visibility", "hidden");
    const pinnedBox = (await pinnedButton.boundingBox())!;
    expect(pinnedBox.y).toBeCloseTo(12, 0);
    // ...and as the same button — same size, not a bar around it.
    const originalBox = (await original.boundingBox())!;
    expect(pinnedBox.width).toBeCloseTo(originalBox.width, 0);
    expect(pinnedBox.height).toBeCloseTo(originalBox.height, 0);
    expect(pinnedBox.x).toBeCloseTo(originalBox.x, 0);

    // Stays put for the rest of the page.
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await expect(pinned).toBeVisible();
    expect((await pinnedButton.boundingBox())!.y).toBeCloseTo(12, 0);

    // Back up to where it started: the real one is back, the twin is gone.
    await page.evaluate(() => window.scrollTo(0, 0));
    await expect(pinned).toBeHidden();
    await expect(original).toBeVisible();
  });

  // Regression check for a real bug: clicking a hash-anchor nav link
  // while already on "/" worked fine (the target is already on the
  // page), but clicking it from a different page navigated to e.g.
  // "/#about" without ever actually scrolling there — the target section
  // hadn't streamed into the DOM yet by the time Next's own
  // scroll-to-hash gave up, and it never retries. See hash-scroll-fix.tsx.
  for (const { label, id } of [
    { label: "About", id: "about" },
    { label: "Book Us", id: "booking" },
  ]) {
    test(`${label} link scrolls to its section when navigating from a different page`, async ({
      page,
    }) => {
      await page.goto("/past-events");
      const hamburger = page.getByRole("button", { name: "Open menu" });
      if (await hamburger.isVisible()) {
        await hamburger.click({ force: true });
      }
      const link = page.getByRole("link", { name: label, exact: true });
      // "Book Us" only renders once real contact details are set in
      // site-content.ts (see site-header.tsx) — skip rather than fail
      // while that's still unconfigured.
      if ((await link.count()) === 0) test.skip(true, `No "${label}" nav link currently rendered.`);
      await link.click();

      await expect
        .poll(
          async () =>
            page.evaluate((elementId) => {
              const el = document.getElementById(elementId);
              if (!el) return false;
              const r = el.getBoundingClientRect();
              return r.top < window.innerHeight && r.bottom > 0;
            }, id),
          { timeout: 3000 }
        )
        .toBe(true);
    });
  }

  test("a hard navigation straight to a hash URL scrolls there and stays put", async ({ page }) => {
    // Regression check for a real (and, while it lasted, severe) bug: a
    // genuine top-level navigation (not a same-app Link click) to
    // "/#about" — e.g. following a shared link while the site's already
    // open on another page — could leave the entire page permanently
    // stuck behind an unrevealed React Suspense boundary, well short of
    // #about ever existing in a laid-out position at all. Root cause
    // turned out to be src/app/loading.tsx's *implicit* Suspense boundary
    // (the Next.js file convention, not anything of this app's own
    // making) whose "reveal" script could silently never fire on this
    // exact navigation pattern — fixed by removing loading.tsx (and its
    // siblings under other routes) app-wide rather than working around a
    // framework-level streaming edge case. Confirmed via two sequential
    // page.goto() calls, which (unlike clicking a Link) are each a real
    // navigation. See hash-scroll-fix.tsx for the (now much smaller)
    // remaining reason this component still exists.
    await page.goto("/past-events");
    await page.goto("/#about");

    // Long enough to outlast every retry in hash-scroll-fix.tsx's own
    // delay schedule, so this only passes if the fix's later re-asserts
    // actually did their job, not just the immediate one.
    await page.waitForTimeout(6500);

    const aboutTop = await page.evaluate(() => document.getElementById("about")?.getBoundingClientRect().top);
    expect(aboutTop).not.toBeUndefined();
    // Not exactly 0 — the section has scroll-mt-[18vh] so it rests with
    // real breathing room below the sticky header rather than flush
    // against it (about 146-167px across this suite's viewports). The
    // bug this guards against left it at the pre-scroll position instead
    // (hundreds/thousands of px further down), so a generous band well
    // under that still catches a regression without being tied to the
    // exact per-viewport offset.
    expect(Math.abs(aboutTop!)).toBeLessThan(220);
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
    // The page streams in behind a loading state — count() doesn't wait,
    // so without this a slow render looked like "no photos" and skipped.
    await expect(page.getByLabel("Bio / business description")).toBeVisible();
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
