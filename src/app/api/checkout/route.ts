import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { stripe } from "@/lib/stripe";
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
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      customer_email: email,
      client_reference_id: order.id,
      line_items: [
        {
          quantity,
          price_data: {
            currency: "usd",
            unit_amount: ticketType.priceCents,
            product_data: {
              name: `${ticketType.event.title} — ${ticketType.name}`,
              description: `${quantity} × ${ticketType.name}`,
            },
          },
        },
      ],
      success_url: `${siteUrl}/checkout/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${siteUrl}/?checkout=canceled`,
      metadata: { orderId: order.id },
    });

    await prisma.order.update({
      where: { id: order.id },
      data: { stripeCheckoutSessionId: session.id },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    // Roll back the pending order so it doesn't linger if Stripe fails.
    await prisma.order.delete({ where: { id: order.id } }).catch(() => {});
    console.error("Stripe checkout session creation failed:", error);
    return NextResponse.json(
      { error: "Could not start checkout. Please try again." },
      { status: 502 }
    );
  }
}
