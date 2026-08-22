import QRCode from "qrcode";
import { siteConfig } from "@/lib/site-config";

/** The URL encoded into a ticket's QR code — opening it (behind an admin
 * login) shows the order and lets the door staff check it in. Any phone's
 * default camera app can scan and open this directly; /admin/scan is a
 * faster in-app scanner for working through a line at the door. */
export function checkInUrl(orderId: string): string {
  return `${siteConfig.siteUrl.replace(/\/$/, "")}/admin/checkin/${orderId}`;
}

/** Renders a scannable QR (as a data: URL, safe to drop straight into an
 * <img src>) encoding this order's check-in URL. */
export function generateOrderQrDataUrl(orderId: string): Promise<string> {
  return QRCode.toDataURL(checkInUrl(orderId), { margin: 1, width: 320 });
}

/** Same QR, as a PNG buffer — for attaching to the confirmation email
 * (some clients strip inline data: URIs, so the emailed ticket also gets
 * this as a real attachment). */
export function generateOrderQrPngBuffer(orderId: string): Promise<Buffer> {
  return QRCode.toBuffer(checkInUrl(orderId), { margin: 1, width: 320 });
}
