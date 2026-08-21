import { sendEmail } from "@/lib/resend";
import { sendWhatsAppTicketConfirmation } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import type { Order, OrderItem, TicketType, Event } from "@prisma/client";

type OrderWithDetails = Order & {
  event: Event;
  items: (OrderItem & { ticketType: TicketType })[];
};

function ticketSummary(order: OrderWithDetails): string {
  return order.items.map((item) => `${item.quantity} × ${item.ticketType.name}`).join(", ");
}

function confirmationEmailHtml(order: OrderWithDetails): string {
  const rows = order.items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;color:#444;">${item.quantity} × ${item.ticketType.name}</td>
        <td style="padding:8px 0;text-align:right;color:#111;">${formatPrice(item.unitPriceCents * item.quantity)}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <p style="color:#888;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px;">
        ${siteConfig.djName} &middot; ${siteConfig.eventSeriesName}
      </p>
      <h1 style="font-size:24px;margin:0 0 16px;">You're in — ${order.event.title}</h1>
      <p style="color:#444;">Hi ${order.customerName}, your tickets are confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;border-top:1px solid #eee;">
        ${rows}
        <tr style="border-top:1px solid #eee;">
          <td style="padding:12px 0;font-weight:bold;">Total</td>
          <td style="padding:12px 0;text-align:right;font-weight:bold;">${formatPrice(order.totalCents)}</td>
        </tr>
      </table>
      <p style="color:#888;font-size:12px;">Order #${order.id.slice(-8).toUpperCase()}</p>
    </div>
  `;
}

/**
 * Sends the order confirmation to whichever contact method the buyer
 * chose at checkout. Best-effort — throws on failure so the caller can
 * decide whether/how to retry or log it, but a failure here should never
 * fail the purchase itself (the payment already succeeded).
 */
export async function sendTicketConfirmation(order: OrderWithDetails): Promise<void> {
  if (order.customerEmail) {
    await sendEmail({
      to: order.customerEmail,
      subject: `Your tickets — ${order.event.title}`,
      html: confirmationEmailHtml(order),
    });
    return;
  }

  if (order.customerPhone) {
    await sendWhatsAppTicketConfirmation({
      to: order.customerPhone,
      customerName: order.customerName,
      eventTitle: order.event.title,
      ticketSummary: ticketSummary(order),
      total: formatPrice(order.totalCents),
    });
    return;
  }

  throw new Error(`Order ${order.id} has neither an email nor a phone number to notify`);
}
