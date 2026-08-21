import { prisma } from "@/lib/prisma";

/**
 * Marks an order as PAID and decrements ticket inventory, exactly once.
 *
 * Called from the checkout success page right after a PayPal order is
 * captured. Safe to call multiple times for the same order — if it's
 * already PAID, this is a no-op.
 */
export async function fulfillOrder(orderId: string, captureId: string | null) {
  return prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return null;
    if (order.status === "PAID") return order; // already fulfilled

    for (const item of order.items) {
      const updated = await tx.ticketType.updateMany({
        where: { id: item.ticketTypeId, quantityRemaining: { gte: item.quantity } },
        data: { quantityRemaining: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        // Oversold edge case — flag for manual follow-up rather than
        // silently taking payment for a ticket we can't fulfill.
        return tx.order.update({
          where: { id: order.id },
          data: { status: "FAILED", paypalCaptureId: captureId ?? undefined },
        });
      }
    }

    return tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paypalCaptureId: captureId ?? undefined },
    });
  });
}
