import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Not layout checks (see mobile.spec.ts for those) — these verify the
// actual access-control behavior: proxy.ts blocking unauthenticated
// requests, and loginAdminAction's brute-force rate limit. Runs
// alongside the mobile suite's three viewport projects, so anything
// that writes state (the rate-limit test) uses a per-run-unique fake IP
// to avoid three parallel projects tripping each other's counters.

function getAdminPassword(): string | null {
  try {
    const env = readFileSync(".env", "utf-8");
    const raw = env.match(/^ADMIN_PASSWORD=(.*)$/m)?.[1]?.trim();
    if (!raw) return null;
    const quoted = raw.match(/^(['"])(.*)\1$/);
    return quoted ? quoted[2] : raw;
  } catch {
    return null;
  }
}

test.describe("unauthenticated access is blocked", () => {
  const PROTECTED_PAGES = ["/admin", "/admin/about", "/admin/events", "/admin/events/new"];

  for (const path of PROTECTED_PAGES) {
    test(`${path} redirects to /admin/login when signed out`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/admin\/login$/);
    });
  }

  test("/admin/login itself stays reachable when signed out", async ({ page }) => {
    const response = await page.goto("/admin/login");
    expect(response?.status()).toBe(200);
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("a forged session cookie is rejected, not just a missing one", async ({ page, context, baseURL }) => {
    // context.addCookies needs a real URL to attach the cookie to — a
    // brand-new page has none yet (page.url() is blank before any
    // navigation), so this can't reuse that the way other cookie-setting
    // tests do.
    await context.addCookies([
      { name: "admin_session", value: "99999999999999.deadbeef", url: baseURL },
    ]);
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/admin\/login$/);
  });

  test("/api/admin/events rejects unauthenticated requests with 401", async ({ request }) => {
    const res = await request.post("/api/admin/events", { data: {} });
    expect(res.status()).toBe(401);
  });

  test("/api/upload rejects unauthenticated requests with 401", async ({ request }) => {
    const res = await request.post("/api/upload", { data: {} });
    expect(res.status()).toBe(401);
  });
});

test.describe("login brute-force rate limit", () => {
  test("blocks further attempts — including the correct password — after repeated failures", async ({
    browser,
  }, testInfo) => {
    const password = getAdminPassword();
    test.skip(!password, "ADMIN_PASSWORD isn't set locally — can't exercise real login.");

    // Unique per project so the three parallel viewport runs don't share
    // (and corrupt) each other's failed-attempt counts.
    const fakeIp = `203.0.113.${testInfo.parallelIndex + 10}`;
    // Rows from this IP don't expire on their own (only the *counting*
    // query ignores anything older than 15 minutes) — clear any leftover
    // ones from a previous run of this same test first, or a run within
    // the last 15 minutes would start already-rate-limited.
    await prisma.adminLoginAttempt.deleteMany({ where: { ipAddress: fakeIp } });
    const context = await browser.newContext({ extraHTTPHeaders: { "x-forwarded-for": fakeIp } });
    const page = await context.newPage();

    async function submitLogin(pwd: string) {
      await page.goto("/admin/login", { waitUntil: "load" });
      await page.fill('input[name="password"]', pwd);
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => url.pathname !== "/admin/login" || url.search.length > 0, {
        timeout: 5000,
      }).catch(() => {});
      return page.textContent("body").catch(() => "");
    }

    for (let i = 0; i < 5; i++) {
      const body = await submitLogin("definitely-wrong");
      expect(body).toContain("Incorrect password");
    }

    const sixthBody = await submitLogin("definitely-wrong");
    expect(sixthBody).toContain("Too many attempts");

    // The real password, still within the same lockout window, must
    // also be refused — the whole point is that a correct guess arriving
    // during a brute-force burst doesn't slip through.
    const seventhBody = await submitLogin(password!);
    expect(seventhBody).toContain("Too many attempts");

    await context.close();
    // Tidy up rather than leaving this IP locked out for the next run
    // within the same 15-minute window too.
    await prisma.adminLoginAttempt.deleteMany({ where: { ipAddress: fakeIp } });
  });
});
