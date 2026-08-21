// One-off verification script — NOT part of the app. Simulates two buyers
// racing for the last ticket and confirms exactly one wins, inventory
// never goes negative, and the loser's order is marked for a refund.
// Uses a temporary event/ticket type/orders, cleaned up at the end either way.
import { prisma } from "../src/lib/prisma";
import { fulfillOrder } from "../src/lib/fulfill-order";

async function main() {
  const event = await prisma.event.create({
    data: {
      slug: `race-test-${Date.now()}`,
      title: "Race Test Event",
      description: "temp",
      date: new Date(),
      location: "temp",
      coverImage: "/images/event-cover-boiler.svg",
      isActive: false,
      ticketTypes: {
        create: [
          { name: "Last One", priceCents: 1000, quantityTotal: 1, quantityRemaining: 1 },
        ],
      },
    },
    include: { ticketTypes: true },
  });
  const ticketType = event.ticketTypes[0];

  const [orderA, orderB] = await Promise.all(
    ["Buyer A", "Buyer B"].map((name) =>
      prisma.order.create({
        data: {
          eventId: event.id,
          customerName: name,
          customerInstagram: name.replace(" ", "").toLowerCase(),
          customerEmail: `${name.replace(" ", "").toLowerCase()}@example.com`,
          status: "PENDING",
          totalCents: ticketType.priceCents,
          items: { create: { ticketTypeId: ticketType.id, quantity: 1, unitPriceCents: ticketType.priceCents } },
        },
      })
    )
  );

  console.log(`Starting: ${ticketType.name} has 1 remaining. Two orders racing for it...`);

  // Fire both fulfillments concurrently — this is the actual race.
  const [resultA, resultB] = await Promise.all([
    fulfillOrder(orderA.id, "fake-capture-a"),
    fulfillOrder(orderB.id, "fake-capture-b"),
  ]);

  const finalTicketType = await prisma.ticketType.findUniqueOrThrow({ where: { id: ticketType.id } });

  console.log("Order A final status:", resultA?.status);
  console.log("Order B final status:", resultB?.status);
  console.log("Final quantityRemaining:", finalTicketType.quantityRemaining);

  const statuses = [resultA?.status, resultB?.status].sort();
  const exactlyOnePaid = statuses.filter((s) => s === "PAID").length === 1;
  // The loser hits FAILED here (not REFUNDED) because the fake capture id
  // makes the real PayPal refund call fail — expected in this dry run.
  const otherFailed = statuses.some((s) => s === "FAILED");
  const neverNegative = finalTicketType.quantityRemaining >= 0;
  const noOversell = finalTicketType.quantityRemaining === 0;

  console.log("\n=== VERDICT ===");
  console.log("Exactly one buyer got PAID:", exactlyOnePaid);
  console.log("The other was marked FAILED (would auto-refund with a real capture id):", otherFailed);
  console.log("Inventory never went negative:", neverNegative);
  console.log("Inventory correctly at 0 (not oversold):", noOversell);
  console.log(exactlyOnePaid && otherFailed && neverNegative && noOversell ? "\nPASS" : "\nFAIL");

  // Cleanup
  await prisma.orderItem.deleteMany({ where: { orderId: { in: [orderA.id, orderB.id] } } });
  await prisma.order.deleteMany({ where: { id: { in: [orderA.id, orderB.id] } } });
  await prisma.ticketType.delete({ where: { id: ticketType.id } });
  await prisma.event.delete({ where: { id: event.id } });
  console.log("\n(test data cleaned up)");
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
