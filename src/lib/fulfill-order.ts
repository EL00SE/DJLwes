import { prisma } from "@/lib/prisma";
import { refundPayPalCapture } from "@/lib/paypal";

/** Thrown inside the transaction below to trigger a full rollback — see fulfillOrder. */
class OversoldError extends Error {}

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
  let oversold = false;

  const order = await prisma.$transaction(async (tx) => {
    const order = await tx.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) return null;
    // PAID, CONFIRMED, and REFUNDED are all "already handled" — nothing
    // left for this function to do (CONFIRMED in particular matters if
    // this is ever called a second time after an admin has approved the
    // order, e.g. from a future webhook).
    if (order.status === "PAID" || order.status === "CONFIRMED" || order.status === "REFUNDED") {
      return order;
    }

    // Multiple ticket types per order are supported by the schema even
    // though today's checkout only ever creates one-item orders. Throwing
    // (rather than returning) on a failed reservation rolls back every
    // decrement already applied earlier in this loop, atomically — a
    // partial reservation is never left committed.
    for (const item of order.items) {
      const updated = await tx.ticketType.updateMany({
        where: { id: item.ticketTypeId, quantityRemaining: { gte: item.quantity } },
        data: { quantityRemaining: { decrement: item.quantity } },
      });
      if (updated.count === 0) {
        throw new OversoldError();
      }
    }

    return tx.order.update({
      where: { id: order.id },
      data: { status: "PAID", paypalCaptureId: captureId ?? undefined },
    });
  }).catch(async (err) => {
    if (!(err instanceof OversoldError)) throw err;
    oversold = true;
    // The reservation transaction above rolled back cleanly, so this is a
    // separate, lightweight write — no inventory changes here.
    return prisma.order.update({
      where: { id: orderId },
      data: { status: "FAILED", paypalCaptureId: captureId ?? undefined },
    });
  });

  if (oversold && order && captureId) {
    try {
      await refundPayPalCapture(captureId);
      return prisma.order.update({ where: { id: orderId }, data: { status: "REFUNDED" } });
    } catch (err) {
      // Leaves the order as FAILED (not REFUNDED) — that's the signal a
      // human needs to issue this refund manually from the PayPal dashboard.
      console.error(`Auto-refund failed for order ${orderId}, capture ${captureId}:`, err);
    }
  } else if (oversold && order && !captureId) {
    // No capture id to refund against — stays FAILED. Logged loudly since
    // this means a payment was taken with no automatic way to reverse it.
    console.error(
      `Order ${orderId} was oversold but has no paypalCaptureId — refund must be issued manually.`
    );
  }

  return order;
}
