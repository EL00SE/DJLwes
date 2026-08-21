import { prisma } from "@/lib/prisma";
import { refundPayPalCapture } from "@/lib/paypal";

/**
 * Marks an order as PAID and decrements ticket inventory, exactly once —
 * or, if inventory ran out from underneath it, automatically refunds the
 * payment instead of quietly keeping money for a ticket we can't deliver.
 *
 * Called from the checkout success page right after a PayPal order is
 * captured. Safe to call multiple times for the same order.
 *
 * Why this can happen at all: ticket availability is only checked when a
 * checkout session is *created*, not reserved. Two buyers going for the
 * last ticket at nearly the same instant can both pass that check and
 * both pay — only one can win the inventory decrement below, which is
 * still race-safe (it's a single conditional SQL UPDATE, so exactly one
 * winner is guaranteed even under concurrent calls). The loser gets
 * refunded here rather than left charged with nothing to show for it.
 */
export async function fulfillOrder(orderId: string, captureId: string | null) {
  const result = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return { outcome: "not-found" as const, order: null };
    if (order.status === "PAID" || order.status === "REFUNDED") {
      return { outcome: "already-settled" as const, order };
    }

    for (const item of order.items) {
      const updated = await tx.ticketType.updateMany({
        where: { id: item.ticketTypeId, quantityRemaining: { gte: item.quantity } },
        data: { quantityRemaining: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        const failed = await tx.order.update({
          where: { id: order.id },
          data: { status: "FAILED", paypalCaptureId: captureId ?? undefined },
        });
        return { outcome: "oversold" as const, order: failed };
      }
    }

    const paid = await tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paypalCaptureId: captureId ?? undefined },
    });
    return { outcome: "fulfilled" as const, order: paid };
  });

  if (result.outcome === "oversold" && captureId) {
    try {
      await refundPayPalCapture(captureId);
      return prisma.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
    } catch (err) {
      // Leaves the order as FAILED (not REFUNDED) — that's the signal a
      // human needs to issue this refund manually from the PayPal dashboard.
      console.error(`Auto-refund failed for order ${orderId}, capture ${captureId}:`, err);
    }
  }

  return result.order;
}
