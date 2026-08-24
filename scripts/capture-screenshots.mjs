// One-off script to generate real README screenshots via a headless
// browser (not part of the app — run manually, then delete the seed
// data it creates). Requires the prod server running on :3000
// (`npm run build && npm start`) and playwright installed
// (`npx playwright install chromium`).
import { chromium } from "playwright";
import { PrismaClient } from "@prisma/client";
import { mkdirSync } from "fs";

const prisma = new PrismaClient();
const BASE = "http://localhost:3000";
const OUT = "docs/screenshots";
mkdirSync(OUT, { recursive: true });

async function main() {
  const event = await prisma.event.findFirst({ where: { isActive: true }, include: { ticketTypes: true } });
  if (!event) throw new Error("No active event seeded");
  const standard = event.ticketTypes.find((t) => t.name === "Standard") ?? event.ticketTypes[0];

  const browser = await chromium.launch();

  // ---- 1. Homepage: hero + tickets + buy panel, desktop, filled in ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1500 } });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Buy" }).nth(1).click(); // Standard
    await page.getByPlaceholder("Your name").fill("Maya Cohen");
    await page.getByPlaceholder("@yourhandle").fill("mayacohen");
    await page.getByPlaceholder("you@example.com").fill("maya@example.com");
    await page.getByRole("button", { name: "Increase quantity" }).click();
    await page.waitForTimeout(600); // let the PayPal buttons iframe paint
    await page.screenshot({ path: `${OUT}/01-homepage-desktop.png` });
    await page.close();
  }

  // ---- 2. Buy panel on mobile, centered ----
  {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    await page.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await page.getByRole("button", { name: "Buy" }).nth(1).click();
    await page.waitForTimeout(700); // smooth-scroll-to-center finishes
    await page.getByPlaceholder("Your name").fill("Maya Cohen");
    await page.getByPlaceholder("@yourhandle").fill("mayacohen");
    await page.getByPlaceholder("you@example.com").fill("maya@example.com");
    await page.screenshot({ path: `${OUT}/02-buy-panel-mobile.png` });
    await page.close();
  }

  // ---- Seed data for the confirmation + admin screenshots ----
  const confirmedOrder = await prisma.order.create({
    data: {
      eventId: event.id,
      customerName: "Maya Cohen",
      customerInstagram: "mayacohen",
      customerEmail: "maya@example.com",
      status: "CONFIRMED",
      paymentMethod: "PAYPAL",
      totalCents: standard.priceCents * 2,
      confirmationSentAt: new Date(),
      receiptNumber: "1042",
      receiptUrl: "https://example.com/receipt-placeholder.pdf",
      receiptIssuedAt: new Date(),
      items: { create: { ticketTypeId: standard.id, quantity: 2, unitPriceCents: standard.priceCents } },
    },
  });

  const paidOrder = await prisma.order.create({
    data: {
      eventId: event.id,
      customerName: "Noam Levi",
      customerInstagram: "noamlevi",
      customerEmail: "noam@example.com",
      status: "PAID",
      paymentMethod: "PAYPAL",
      totalCents: standard.priceCents,
      items: { create: { ticketTypeId: standard.id, quantity: 1, unitPriceCents: standard.priceCents } },
    },
  });

  const bankTransferOrder = await prisma.order.create({
    data: {
      eventId: event.id,
      customerName: "Tamar Ben-David",
      customerInstagram: "tamarbd",
      customerPhone: "+972 50 123 4567",
      status: "PENDING",
      paymentMethod: "BANK_TRANSFER",
      totalCents: event.ticketTypes.find((t) => t.name === "Early Bird").priceCents * 3,
      items: {
        create: {
          ticketTypeId: event.ticketTypes.find((t) => t.name === "Early Bird").id,
          quantity: 3,
          unitPriceCents: event.ticketTypes.find((t) => t.name === "Early Bird").priceCents,
        },
      },
    },
  });

  const retryReceiptOrder = await prisma.order.create({
    data: {
      eventId: event.id,
      customerName: "Yotam Shapiro",
      customerInstagram: "yotamsh",
      customerEmail: "yotam@example.com",
      status: "CONFIRMED",
      paymentMethod: "PAYPAL",
      totalCents: standard.priceCents,
      confirmationSentAt: new Date(),
      receiptError: "Green Invoice is not configured",
      checkedInAt: new Date(),
      items: { create: { ticketTypeId: standard.id, quantity: 1, unitPriceCents: standard.priceCents } },
    },
  });

  // ---- Log in as admin (reuses ADMIN_PASSWORD from the running server's .env) ----
  const adminPage = await browser.newPage({ viewport: { width: 1280, height: 1400 } });
  await adminPage.goto(`${BASE}/admin/login`, { waitUntil: "networkidle" });
  await adminPage.getByPlaceholder("Password").fill(process.env.ADMIN_PASSWORD ?? "wearelive");
  await adminPage.getByRole("button", { name: "Sign In" }).click();
  await adminPage.waitForURL(`${BASE}/admin`);

  // ---- 3. Checkout confirmation page, with entrance QR ----
  {
    const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });
    await page.goto(`${BASE}/checkout/success?orderId=${confirmedOrder.id}`, { waitUntil: "networkidle" });
    await page.screenshot({ path: `${OUT}/03-checkout-confirmation.png` });
    await page.close();
  }

  // ---- 4. Admin dashboard ----
  {
    await adminPage.goto(`${BASE}/admin`, { waitUntil: "networkidle" });
    await adminPage.screenshot({ path: `${OUT}/04-admin-dashboard.png` });
  }

  // ---- 5. Admin event editor ----
  {
    await adminPage.goto(`${BASE}/admin/events/${event.id}/edit`, { waitUntil: "networkidle" });
    await adminPage.screenshot({ path: `${OUT}/05-admin-event-editor.png` });
  }

  // ---- 6. Admin scan page — manually check in the confirmed order, so
  // the shot shows the green success banner rather than an empty scanner
  // (no camera in a headless browser to demo the real scan path with).
  {
    await adminPage.goto(`${BASE}/admin/scan`, { waitUntil: "networkidle" });
    const reference = confirmedOrder.id.slice(-8).toUpperCase();
    await adminPage.getByPlaceholder("Order code, e.g. A1B2C3D4").fill(reference);
    await adminPage.getByRole("button", { name: "Check In" }).click();
    await adminPage.waitForTimeout(700);
    await adminPage.screenshot({ path: `${OUT}/06-admin-scan.png` });
  }

  await adminPage.close();
  await browser.close();

  // Clean up the sample orders this script created — they're only here to
  // make the admin screenshots look populated, not real data to keep.
  const seededIds = [confirmedOrder.id, paidOrder.id, bankTransferOrder.id, retryReceiptOrder.id];
  await prisma.order.deleteMany({ where: { id: { in: seededIds } } });
  console.log(`Done — screenshots written to ${OUT}/, and the ${seededIds.length} sample orders cleaned up.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
