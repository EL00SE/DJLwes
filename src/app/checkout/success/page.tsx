import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { capturePayPalOrder } from "@/lib/paypal";
import { fulfillOrder } from "@/lib/fulfill-order";
import { orderReference, orderWithDetailsInclude } from "@/lib/orders";
import { formatPrice } from "@/lib/format";
import { bankTransferDetails } from "@/lib/bank-details";
import { generateOrderQrDataUrl } from "@/lib/qr";

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

  const fetchOrder = () =>
    prisma.order.findUnique({ where: { id: orderId }, include: orderWithDetailsInclude });

  let order = await fetchOrder();

  if (order && order.status === "PENDING" && order.paypalOrderId) {
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
    // Re-fetch since fulfillOrder may have changed the status.
    order = await fetchOrder();
  }

  if (!order) {
    return (
      <FailureState
        heading="We couldn't find that order"
        message="If you were charged, contact us and we'll sort it out."
      />
    );
  }

  if (order.paymentMethod === "BANK_TRANSFER" && order.status === "PENDING") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-5 py-24 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
          Request received
        </p>
        <h1 className="text-glow font-display text-5xl tracking-wide text-ink sm:text-6xl">
          Send Your Transfer
        </h1>
        <p className="text-ink-muted">
          Transfer {formatPrice(order.totalCents)} to the account below, including the reference
          so we can match it to your order — we&apos;ll confirm it by hand and reach out via{" "}
          {order.customerEmail ? "email" : "WhatsApp"} once we see it.
        </p>

        <div className="card-edge mt-2 w-full rounded-3xl border border-line p-6 text-left sm:p-8">
          <dl className="flex flex-col gap-3 text-sm">
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">Account holder</dt>
              <dd className="text-ink">{bankTransferDetails.accountHolder}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">Bank</dt>
              <dd className="text-ink">{bankTransferDetails.bankName}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">Branch</dt>
              <dd className="text-ink">{bankTransferDetails.branch}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">Account number</dt>
              <dd className="text-ink">{bankTransferDetails.accountNumber}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">IBAN</dt>
              <dd className="text-ink">{bankTransferDetails.iban}</dd>
            </div>
            <div className="flex items-center justify-between">
              <dt className="text-ink-faint">SWIFT</dt>
              <dd className="text-ink">{bankTransferDetails.swift}</dd>
            </div>
          </dl>
          <div className="mt-4 flex items-center justify-between border-t border-line pt-4">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
              Reference (include this!)
            </span>
            <span className="font-display text-2xl tracking-wide text-accent-bright">
              {orderReference(order.id)}
            </span>
          </div>
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

  if (order.status === "PAID") {
    return (
      <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-5 py-24 text-center">
        <div className="glow-field pointer-events-none absolute" />
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-mint">Payment received</p>
        <h1 className="text-glow font-display text-5xl tracking-wide text-ink sm:text-6xl">
          Awaiting Confirmation
        </h1>
        <p className="text-ink-muted">
          You&apos;ve been charged {formatPrice(order.totalCents)} for {order.event.title}.
          We manually confirm each order before sending tickets — you&apos;ll hear from us via{" "}
          {order.customerEmail ? "email" : "WhatsApp"} shortly.
        </p>
        <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
          Order #{orderReference(order.id)}
        </p>
        <Link
          href="/"
          className="mt-2 rounded-full border border-accent-dim px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-accent-bright transition-colors hover:bg-accent hover:text-white"
        >
          Back Home
        </Link>
      </div>
    );
  }

  if (order.status !== "CONFIRMED") {
    return (
      <FailureState
        heading="Payment still processing"
        message="Hang tight — refresh this page in a few seconds. If this persists, contact us with your confirmation email."
      />
    );
  }

  const qrDataUrl = await generateOrderQrDataUrl(order.id);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-6 px-5 py-24 text-center">
      <div className="glow-field pointer-events-none absolute" />
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-mint">You&apos;re in</p>
      <h1 className="text-glow font-display text-6xl tracking-wide text-ink">
        Tickets Confirmed
      </h1>
      <p className="text-ink-muted">
        {order.customerEmail ? (
          <>
            Sent to <span className="text-ink">{order.customerEmail}</span>
          </>
        ) : (
          <>
            Sent via WhatsApp to <span className="text-ink">{order.customerPhone}</span>
          </>
        )}{" "}
        — save this page as your confirmation too.
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
          Order #{orderReference(order.id)} &middot; {order.customerName}
        </p>
      </div>

      <div className="card-edge flex w-full flex-col items-center gap-3 rounded-3xl border border-line p-6 sm:p-8">
        <p className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
          Entrance QR — show this at the door
        </p>
        {/* eslint-disable-next-line @next/next/no-img-element -- a generated data: URL, not an optimizable remote/static asset */}
        <img src={qrDataUrl} alt="Entrance QR code" width={220} height={220} className="rounded-2xl" />
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
