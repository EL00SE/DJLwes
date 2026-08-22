import { sendEmail } from "@/lib/resend";
import { sendWhatsAppTicketConfirmation } from "@/lib/whatsapp";
import { formatPrice } from "@/lib/format";
import { siteConfig } from "@/lib/site-config";
import { generateOrderQrDataUrl, generateOrderQrPngBuffer } from "@/lib/qr";
import { orderReference, type OrderWithDetails } from "@/lib/orders";

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function ticketSummary(order: OrderWithDetails): string {
  return order.items.map((item) => `${item.quantity} × ${item.ticketType.name}`).join(", ");
}

function confirmationEmailHtml(order: OrderWithDetails, qrDataUrl: string): string {
  const rows = order.items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;color:#444;">${item.quantity} × ${escapeHtml(item.ticketType.name)}</td>
        <td style="padding:8px 0;text-align:right;color:#111;">${formatPrice(item.unitPriceCents * item.quantity)}</td>
      </tr>`
    )
    .join("");

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <p style="color:#888;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px;">
        ${escapeHtml(siteConfig.djName)} &middot; ${escapeHtml(siteConfig.eventSeriesName)}
      </p>
      <h1 style="font-size:24px;margin:0 0 16px;">You're in — ${escapeHtml(order.event.title)}</h1>
      <p style="color:#444;">Hi ${escapeHtml(order.customerName)}, your tickets are confirmed.</p>
      <table style="width:100%;border-collapse:collapse;margin:24px 0;border-top:1px solid #eee;">
        ${rows}
        <tr style="border-top:1px solid #eee;">
          <td style="padding:12px 0;font-weight:bold;">Total</td>
          <td style="padding:12px 0;text-align:right;font-weight:bold;">${formatPrice(order.totalCents)}</td>
        </tr>
      </table>
      <p style="color:#888;font-size:12px;">Order #${orderReference(order.id)}</p>
      <div style="text-align:center;margin-top:8px;">
        <p style="color:#888;font-size:11px;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 8px;">
          Show this at the door
        </p>
        <img src="${qrDataUrl}" width="200" height="200" alt="Entrance QR code" style="display:inline-block;" />
        <p style="color:#aaa;font-size:10px;margin-top:6px;">
          (Also attached as an image, in case it doesn't show above.)
        </p>
      </div>
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
    const [qrDataUrl, qrPng] = await Promise.all([
      generateOrderQrDataUrl(order.id),
      generateOrderQrPngBuffer(order.id),
    ]);
    await sendEmail({
      to: order.customerEmail,
      subject: `Your tickets — ${order.event.title}`,
      html: confirmationEmailHtml(order, qrDataUrl),
      attachments: [{ filename: "entrance-qr.png", content: qrPng.toString("base64") }],
    });
    return;
  }

  if (order.customerPhone) {
    // WhatsApp template messages can't carry a generated image inline (the
    // approved template would need its own image header + a publicly
    // hosted URL) — buyers get their scannable QR by following this link
    // back to their own success page instead, which already shows it.
    await sendWhatsAppTicketConfirmation({
      to: order.customerPhone,
      customerName: order.customerName,
      eventTitle: order.event.title,
      ticketSummary: ticketSummary(order),
      total: formatPrice(order.totalCents),
      ticketUrl: `${siteConfig.siteUrl.replace(/\/$/, "")}/checkout/success?orderId=${order.id}`,
    });
    return;
  }

  throw new Error(`Order ${order.id} has neither an email nor a phone number to notify`);
}
