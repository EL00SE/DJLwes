import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createPayPalOrder, findApproveLink } from "@/lib/paypal";
import { siteConfig } from "@/lib/site-config";

const checkoutSchema = z.object({
  eventId: z.string().min(1),
  ticketTypeId: z.string().min(1),
  quantity: z.number().int().min(1).max(10),
  name: z.string().trim().min(1, "Name is required").max(200),
  email: z.string().trim().email("A valid email is required"),
});

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const parsed = checkoutSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid request" },
      { status: 400 }
    );
  }
  const { eventId, ticketTypeId, quantity, name, email } = parsed.data;

  const ticketType = await prisma.ticketType.findUnique({
    where: { id: ticketTypeId },
    include: { event: true },
  });

  if (!ticketType || ticketType.eventId !== eventId) {
    return NextResponse.json({ error: "Ticket type not found" }, { status: 404 });
  }
  if (!ticketType.event.isActive) {
    return NextResponse.json({ error: "This event is no longer on sale" }, { status: 410 });
  }
  if (ticketType.quantityRemaining < quantity) {
    return NextResponse.json(
      { error: "Not enough tickets remaining at that quantity" },
      { status: 409 }
    );
  }

  const totalCents = ticketType.priceCents * quantity;

  const order = await prisma.order.create({
    data: {
      eventId,
      customerName: name,
      customerEmail: email,
      status: "PENDING",
      totalCents,
      items: {
        create: {
          ticketTypeId: ticketType.id,
          quantity,
          unitPriceCents: ticketType.priceCents,
        },
      },
    },
  });

  const siteUrl = siteConfig.siteUrl.replace(/\/$/, "");

  try {
    const paypalOrder = await createPayPalOrder({
      referenceId: order.id,
      description: `${ticketType.event.title} — ${quantity} × ${ticketType.name}`,
      amountCents: totalCents,
      returnUrl: `${siteUrl}/checkout/success?orderId=${order.id}`,
      cancelUrl: `${siteUrl}/?checkout=canceled`,
    });

    const approveUrl = findApproveLink(paypalOrder);
    if (!approveUrl) {
      throw new Error("PayPal order response had no approve link");
    }

    await prisma.order.update({
      where: { id: order.id },
      data: { paypalOrderId: paypalOrder.id },
    });

    return NextResponse.json({ url: approveUrl });
  } catch (error) {
    // Roll back the pending order so it doesn't linger if PayPal fails.
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    console.error("PayPal order creation failed:", error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 }
    );
  }
}
