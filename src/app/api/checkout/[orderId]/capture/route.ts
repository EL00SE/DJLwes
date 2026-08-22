import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { captureAndFulfillOrder } from "@/lib/fulfill-order";

/**
 * Called by the client once a buyer approves payment through any PayPal
 * funding source — the standard PayPal/Venmo button's onApprove, or
 * Apple Pay/Google Pay's confirmOrder — since all three converge on the
 * same Orders v2 capture call from here. See
 * src/components/paypal-checkout-buttons.tsx.
 *
 * No admin auth: the order id is an unguessable cuid, same trust model as
 * the public /checkout/success page's own lookup-by-id.
 */
export async function POST(_request: Request, { params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;

  const order = await prisma.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod !== "PAYPAL") {
    return NextResponse.json({ error: "Order not found" }, { status: 404 });
  }

  await captureAndFulfillOrder(order);

  const fresh = await prisma.order.findUnique({ where: { id: orderId } });
  return NextResponse.json({ orderId: order.id, status: fresh?.status ?? order.status });
}
