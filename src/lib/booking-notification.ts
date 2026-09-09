import { sendEmail } from "@/lib/resend";
import { escapeHtml } from "@/lib/html";
import { siteConfig } from "@/lib/site-config";
import { formatEventDate } from "@/lib/format";
import type { BookingRequest } from "@prisma/client";

// Who gets pinged when someone submits the "Book DJ Lwes" form. Optional
// on purpose — the request is always saved to the DB and visible in
// /admin either way, so leaving this unset just means checking the
// dashboard by hand instead of getting an email nudge.
const notifyAddress = process.env.BOOKING_NOTIFICATION_EMAIL;

function notificationEmailHtml(request: BookingRequest): string {
  const contactLines = [
    request.customerEmail ? `Email: ${escapeHtml(request.customerEmail)}` : null,
    request.customerPhone ? `Phone: ${escapeHtml(request.customerPhone)}` : null,
  ].filter(Boolean);

  return `
    <div style="font-family:Arial,Helvetica,sans-serif;max-width:480px;margin:0 auto;padding:24px;">
      <p style="color:#888;font-size:12px;letter-spacing:0.1em;text-transform:uppercase;margin:0 0 8px;">
        ${escapeHtml(siteConfig.djName)} &middot; Private booking inquiry
      </p>
      <h1 style="font-size:22px;margin:0 0 16px;">${escapeHtml(request.customerName)}</h1>
      <p style="color:#444;white-space:pre-line;">${contactLines.join("<br/>")}</p>
      ${
        request.eventDate
          ? `<p style="color:#444;">Wants a date around: ${escapeHtml(formatEventDate(request.eventDate))}</p>`
          : ""
      }
      <p style="color:#444;white-space:pre-line;border-top:1px solid #eee;margin-top:16px;padding-top:16px;">${escapeHtml(request.message)}</p>
    </div>
  `;
}

/** Best-effort — the booking request is already saved by the time this is
 * called, so a failure here (missing config, Resend hiccup) should never
 * fail the visitor's submission. Caller is expected to catch. */
export async function notifyAdminOfBookingRequest(request: BookingRequest): Promise<void> {
  if (!notifyAddress) return;

  await sendEmail({
    to: notifyAddress,
    subject: `New booking inquiry — ${request.customerName}`,
    html: notificationEmailHtml(request),
  });
}
