import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { formatDateTime, formatPrice } from "@/lib/format";
import { orderReference } from "@/lib/orders";
import { requireAdmin } from "@/app/admin/actions";
import { checkInOrderFormAction, undoCheckInAction } from "@/app/admin/checkin-actions";

export const dynamic = "force-dynamic";

function ticketSummary(items: { quantity: number; ticketType: { name: string } }[]) {
  return items.map((item) => `${item.quantity} × ${item.ticketType.name}`).join(", ");
}

/**
 * What a ticket's QR code actually opens — any phone's camera app can
 * scan and land here directly (behind the admin login), no dedicated
 * scanner needed. /admin/scan exists on top of this for working through
 * a line quickly without a full page load per ticket.
 */
export default async function CheckInPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  await requireAdmin();
  const { orderId } = await params;

  const order = await prisma.order.findUnique({
    where: { id: orderId },
    include: { event: true, items: { include: { ticketType: true } } },
  });

  if (!order) {
    return (
      <div className="mx-auto max-w-md px-5 py-16 text-center">
        <h1 className="font-display text-3xl text-ink">Order not found</h1>
        <p className="mt-2 text-ink-muted">This QR doesn&apos;t match any order.</p>
        <Link href="/admin" className="mt-6 inline-block font-mono text-xs uppercase tracking-[0.15em] text-accent-bright">
          ← Back to admin
        </Link>
      </div>
    );
  }

  const isConfirmed = order.status === "CONFIRMED";

  return (
    <div className="mx-auto max-w-md px-5 py-16">
      <Link href="/admin" className="font-mono text-xs uppercase tracking-[0.15em] text-ink-faint hover:text-ink">
        ← Admin
      </Link>

      {!isConfirmed && (
        <div className="mt-6 rounded-2xl border border-magenta bg-magenta/10 p-4 text-sm text-magenta">
          This order was never confirmed (status: {order.status}). Do not admit on this QR alone.
        </div>
      )}

      <div className="card-edge mt-6 rounded-3xl border border-line p-6">
        <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-bright">
          {order.event.title}
        </p>
        <h1 className="mt-1 font-display text-3xl tracking-wide text-ink">{order.customerName}</h1>
        <p className="mt-1 font-mono text-sm text-ink-faint">@{order.customerInstagram.replace(/^@/, "")}</p>

        <div className="mt-4 flex flex-col gap-2 border-t border-line pt-4 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-ink-faint">Tickets</span>
            <span className="text-ink">{ticketSummary(order.items)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-faint">Total</span>
            <span className="text-ink">{formatPrice(order.totalCents)}</span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-ink-faint">Order</span>
            <span className="font-mono text-ink">{orderReference(order.id)}</span>
          </div>
        </div>

        <div className="mt-6 border-t border-line pt-4">
          {order.checkedInAt ? (
            <>
              <p className="font-mono text-sm uppercase tracking-[0.1em] text-mint">
                ✓ Checked in at {formatDateTime(order.checkedInAt)}
              </p>
              <form action={undoCheckInAction.bind(null, order.id)} className="mt-3">
                <button
                  type="submit"
                  className="rounded-full border border-line-strong px-5 py-2 font-mono text-xs uppercase tracking-[0.15em] text-ink-muted transition-colors hover:border-magenta hover:text-magenta"
                >
                  Undo check-in
                </button>
              </form>
            </>
          ) : isConfirmed ? (
            <form action={checkInOrderFormAction.bind(null, order.id)}>
              <button
                type="submit"
                className="w-full rounded-full bg-accent px-5 py-3 font-mono text-sm uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90"
              >
                Check In
              </button>
            </form>
          ) : (
            <p className="font-mono text-sm uppercase tracking-[0.1em] text-ink-faint">Not checked in</p>
          )}
        </div>
      </div>
    </div>
  );
}
