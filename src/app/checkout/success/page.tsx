import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder } from "@/lib/paypal";
import { fulfillOrder } from "@/lib/fulfill-order";
import { formatPrice } from "@/lib/format";

export const dynamic = "force-dynamic";

function FailureState({ heading, message }: { heading: string; message: string }) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-5 py-32 text-center">
      <h1 className="font-display text-4xl tracking-wide text-ink">{heading}</h1>
      <p className="text-ink-muted">{message}</p>
      <Link
        href="/"
        className="mt-4 rounded-full border border-accent-dim px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-accent-bright transition-colors hover:bg-accent hover:text-white"
      >
        Back Home
      </Link>
    </div>
  );
}

export default async function CheckoutSuccessPage({
  searchParams,
}: {
  // PayPal appends `token` (its order id) and `PayerID` to whatever
  // return_url we gave it; `orderId` is ours, added when we built that URL.
  searchParams: Promise<{ orderId?: string; token?: string }>;
}) {
  const { orderId } = await searchParams;

  if (!orderId) {
    return (
      <FailureState
        heading="No order found"
        message="We couldn't find an order to confirm."
      />
    );
  }

  let order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { event: true, items: { include: { ticketType: true } } },
  });

  if (!order) {
    return (
      <FailureState
        heading="We couldn't find that order"
        message="If you were charged, contact us and we'll sort it out."
      />
    );
  }

  if (order.status === "PENDING" && order.paypalOrderId) {
    try {
      const capture = await capturePayPalOrder(order.paypalOrderId);
      const captureId = capture.purchase_units?.[0]?.payments?.captures?.[0]?.id ?? null;
      if (capture.status === "COMPLETED") {
        await fulfillOrder(order.id, captureId);
      }
    } catch (err) {
      // A 422 here usually just means it was already captured (e.g. the
      // buyer refreshed this page) — fulfillOrder is idempotent either way,
      // so only log unexpected failures rather than surfacing an error.
      console.error("PayPal capture failed:", err);
    }
    // Re-fetch (with relations) since fulfillOrder may have changed the status.
    order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { event: true, items: { include: { ticketType: true } } },
    });
  }

  if (!order) {
    return (
      <FailureState
        heading="We couldn't find that order"
        message="If you were charged, contact us and we'll sort it out."
      />
    );
  }

  if (order.status === "REFUNDED") {
    return (
      <FailureState
        heading="That ticket just sold out"
        message="You were briefly charged while completing payment, but the last ticket was taken a moment before you — you've been automatically refunded in full and won't be charged. Sorry about that. Check back in case more become available."
      />
    );
  }

  if (order.status === "FAILED") {
    return (
      <FailureState
        heading="Something went wrong"
        message="Your payment may have gone through but we couldn't confirm your tickets. We've been notified — contact us with your email and we'll make it right."
      />
    );
  }

  if (order.status !== "PAID") {
    return (
      <FailureState
        heading="Payment still processing"
        message="Hang tight — refresh this page in a few seconds. If this persists, contact us with your confirmation email."
      />
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-5 py-24 text-center">
      <div className="glow-field pointer-events-none absolute" />
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-mint">You&apos;re in</p>
      <h1 className="text-glow font-display text-6xl tracking-wide text-ink">
        Tickets Confirmed
      </h1>
      <p className="text-ink-muted">
        Booked under <span className="text-ink">{order.customerEmail}</span> — save this page as
        your confirmation.
      </p>

      <div className="card-edge mt-4 w-full rounded-3xl border border-line p-6 text-left sm:p-8">
        <p className="font-display text-3xl tracking-wide text-ink">{order.event.title}</p>
        <div className="mt-4 flex flex-col gap-3 border-t border-line pt-4">
          {order.items.map((item) => (
            <div key={item.id} className="flex items-center justify-between text-sm">
              <span className="text-ink-muted">
                {item.quantity} × {item.ticketType.name}
              </span>
              <span className="text-ink">{formatPrice(item.unitPriceCents * item.quantity)}</span>
            </div>
          ))}
        </div>
        <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
          <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">Total</span>
          <span className="font-display text-3xl text-ink">{formatPrice(order.totalCents)}</span>
        </div>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
          Order #{order.id.slice(-8).toUpperCase()} &middot; {order.customerName}
        </p>
      </div>

      <Link
        href="/"
        className="mt-2 rounded-full border border-accent-dim px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-accent-bright transition-colors hover:bg-accent hover:text-white"
      >
        Back Home
      </Link>
    </div>
  );
}
