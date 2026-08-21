import { prisma } from "@/lib/prisma";
import type Stripe from "stripe";

/**
 * Marks an order as PAID and decrements ticket inventory, exactly once.
 *
 * Called from both the Stripe webhook (the source of truth in production)
 * and the success page (a fallback so the demo works end-to-end even
 * without a webhook listener configured, e.g. local testing without the
 * Stripe CLI). Safe to call multiple times for the same session.
 */
export async function fulfillOrderFromSession(session: Stripe.Checkout.Session) {
  if (session.payment_status !== "paid") return null;

  const orderId = session.metadata?.orderId ?? session.client_reference_id;
  if (!orderId) return null;

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
          data: {
            status: "FAILED",
            stripePaymentIntentId:
              typeof session.payment_intent === "string" ? session.payment_intent : undefined,
          },
        });
      }
    }

    return tx.order.update({
      where: { id: order.id },
      data: {
        status: "PAID",
        stripePaymentIntentId:
          typeof session.payment_intent === "string" ? session.payment_intent : undefined,
      },
    });
  });
}
