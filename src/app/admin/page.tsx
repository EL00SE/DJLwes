import { prisma } from "@/lib/prisma";
import { formatPrice, formatDateTime } from "@/lib/format";
import { orderWithDetailsInclude } from "@/lib/orders";
import {
  confirmOrderAction,
  declineOrderAction,
  logoutAdminAction,
  requireAdmin,
  resendConfirmationAction,
} from "@/app/admin/actions";

export const dynamic = "force-dynamic";

function ticketSummary(items: { quantity: number; ticketType: { name: string } }[]) {
  return items.map((item) => `${item.quantity} × ${item.ticketType.name}`).join(", ");
}

function ContactLine({ email, phone }: { email: string | null; phone: string | null }) {
  if (email) return <span>{email}</span>;
  return <span>{phone} (WhatsApp)</span>;
}

export default async function AdminPage() {
  await requireAdmin();

  // Checkouts that were started but never paid — e.g. the buyer abandoned
  // PayPal partway through. Purely informational (nothing to approve),
  // capped to the last two days so it doesn't fill up with ancient noise.
  const twoDaysAgo = new Date();
  twoDaysAgo.setHours(twoDaysAgo.getHours() - 48);

  // Independent queries — run together rather than one after another.
  const [pendingOrders, unpaidOrders, recentOrders] = await Promise.all([
    prisma.order.findMany({
      where: { status: "PAID" },
      orderBy: { createdAt: "asc" },
      include: orderWithDetailsInclude,
    }),
    prisma.order.findMany({
      where: { status: "PENDING", createdAt: { gte: twoDaysAgo } },
      orderBy: { createdAt: "desc" },
      take: 20,
      include: orderWithDetailsInclude,
    }),
    prisma.order.findMany({
      where: { status: { in: ["CONFIRMED", "REFUNDED", "FAILED", "CANCELED"] } },
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: orderWithDetailsInclude,
    }),
  ]);

  return (
    <div className="mx-auto max-w-4xl px-5 py-12 sm:px-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">Admin</p>
          <h1 className="mt-1 font-display text-4xl tracking-wide text-ink">Order Approvals</h1>
        </div>
        <form action={logoutAdminAction}>
          <button
            type="submit"
            className="rounded-full border border-line-strong px-4 py-2 font-mono text-xs uppercase tracking-[0.15em] text-ink-muted transition-colors hover:text-ink"
          >
            Log out
          </button>
        </form>
      </div>

      <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">
        Awaiting your approval ({pendingOrders.length})
      </h2>

      {pendingOrders.length === 0 ? (
        <p className="mb-12 text-ink-muted">Nothing waiting on you right now.</p>
      ) : (
        <div className="mb-12 flex flex-col gap-4">
          {pendingOrders.map((order) => (
            <div key={order.id} className="card-edge rounded-2xl border border-line p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl tracking-wide text-ink">{order.customerName}</p>
                  <a
                    href={`https://instagram.com/${order.customerInstagram.replace(/^@/, "")}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-sm text-accent-bright hover:underline"
                  >
                    @{order.customerInstagram.replace(/^@/, "")}
                  </a>
                  <p className="mt-1 text-sm text-ink-muted">
                    <ContactLine email={order.customerEmail} phone={order.customerPhone} />
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-display text-2xl text-ink">{formatPrice(order.totalCents)}</p>
                  <p className="font-mono text-xs text-ink-faint">{formatDateTime(order.createdAt)}</p>
                </div>
              </div>

              <p className="mt-3 text-sm text-ink-muted">
                <span className="text-ink">{order.event.title}</span> — {ticketSummary(order.items)}
              </p>

              <div className="mt-4 flex gap-2">
                <form action={confirmOrderAction.bind(null, order.id)}>
                  <button
                    type="submit"
                    className="rounded-full bg-accent px-5 py-2 font-mono text-xs uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90"
                  >
                    Approve
                  </button>
                </form>
                <form action={declineOrderAction.bind(null, order.id)}>
                  <button
                    type="submit"
                    className="rounded-full border border-line-strong px-5 py-2 font-mono text-xs uppercase tracking-[0.15em] text-ink-muted transition-colors hover:border-magenta hover:text-magenta"
                  >
                    Decline &amp; Refund
                  </button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">
        Started, not paid ({unpaidOrders.length})
      </h2>
      {unpaidOrders.length === 0 ? (
        <p className="mb-12 text-ink-muted">No abandoned checkouts in the last 48 hours.</p>
      ) : (
        <div className="mb-12 flex flex-col gap-2">
          {unpaidOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm opacity-70"
            >
              <div>
                <span className="text-ink">{order.customerName}</span>{" "}
                <span className="text-ink-faint">@{order.customerInstagram.replace(/^@/, "")}</span>{" "}
                <span className="text-ink-muted">— {ticketSummary(order.items)}</span>
              </div>
              <span className="font-mono text-xs text-ink-faint">{formatDateTime(order.createdAt)}</span>
            </div>
          ))}
        </div>
      )}

      <h2 className="mb-4 font-mono text-xs uppercase tracking-[0.25em] text-ink-faint">
        Recent history
      </h2>
      {recentOrders.length === 0 ? (
        <p className="text-ink-muted">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-2">
          {recentOrders.map((order) => (
            <div
              key={order.id}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line px-4 py-3 text-sm"
            >
              <div>
                <span className="text-ink">{order.customerName}</span>{" "}
                <span className="text-ink-faint">@{order.customerInstagram.replace(/^@/, "")}</span>{" "}
                <span className="text-ink-muted">— {ticketSummary(order.items)}</span>
              </div>
              <div className="flex items-center gap-3">
                <span
                  className={`font-mono text-xs uppercase tracking-[0.1em] ${
                    order.status === "CONFIRMED"
                      ? "text-mint"
                      : order.status === "REFUNDED"
                        ? "text-ink-faint"
                        : "text-magenta"
                  }`}
                >
                  {order.status}
                </span>
                {order.status === "CONFIRMED" && !order.confirmationSentAt && (
                  <form action={resendConfirmationAction.bind(null, order.id)}>
                    <button
                      type="submit"
                      className="rounded-full border border-line-strong px-3 py-1 font-mono text-[10px] uppercase tracking-wide text-ink-muted hover:text-ink"
                    >
                      Resend
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
