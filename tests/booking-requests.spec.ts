import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Unlike mobile.spec.ts (deliberately read-only against the shared
// dev/prod database), these tests actually submit the booking form — so
// every row created here is identified by a name unique to that test and
// deleted again afterward, never left behind.

test.describe("booking request form", () => {
  test("a real submission is saved and shows the confirmation message", async ({ page }, testInfo) => {
    const name = `Playwright Test ${testInfo.parallelIndex} ${Date.now()}`;
    await page.goto("/#booking");
    // Scoped to the booking section itself — the homepage's "notify me"
    // form (shown when there's no active event) also has an email-ish
    // label, and an unscoped getByLabel("Email") would match both.
    const section = page.locator("#booking");
    await section.getByLabel("Name", { exact: true }).fill(name);
    await section.getByLabel("Email (or phone below)").fill("playwright-test@example.com");
    await section.getByLabel("Tell us about it").fill("A test booking inquiry from Playwright.");
    await section.getByRole("button", { name: "Send Request" }).click();

    await expect(section.getByText("Request sent")).toBeVisible();

    const saved = await prisma.bookingRequest.findFirst({ where: { customerName: name } });
    expect(saved).not.toBeNull();
    expect(saved?.customerEmail).toBe("playwright-test@example.com");

    await prisma.bookingRequest.deleteMany({ where: { customerName: name } });
  });

  test("submitting with neither email nor phone is rejected client-side", async ({ page }) => {
    await page.goto("/#booking");
    const section = page.locator("#booking");
    await section.getByLabel("Name", { exact: true }).fill("No Contact Method");
    await section.getByLabel("Tell us about it").fill("Should not be saved.");
    await section.getByRole("button", { name: "Send Request" }).click();

    await expect(section.getByRole("alert")).toContainText(/email or phone/i);
    const saved = await prisma.bookingRequest.findFirst({ where: { customerName: "No Contact Method" } });
    expect(saved).toBeNull();
  });

  test("a filled honeypot is silently discarded, not saved", async ({ page }, testInfo) => {
    // The honeypot input itself is hidden from real users (see
    // booking-request-form.tsx) — filling it directly is exactly what a
    // bot that fills in every field it finds would do.
    const name = `Honeypot Test ${testInfo.parallelIndex} ${Date.now()}`;
    await page.goto("/#booking");
    const section = page.locator("#booking");
    await section.getByLabel("Name", { exact: true }).fill(name);
    await section.getByLabel("Email (or phone below)").fill("bot@example.com");
    await section.getByLabel("Tell us about it").fill("Should not be saved.");
    await section.locator("#booking-company").fill("Bot Co");
    await section.getByRole("button", { name: "Send Request" }).click();

    // The route reports success either way, so the bot gets no signal —
    // confirm via the DB that nothing was actually written.
    await expect(section.getByText("Request sent")).toBeVisible();
    const saved = await prisma.bookingRequest.findFirst({ where: { customerName: name } });
    expect(saved).toBeNull();
  });
});
