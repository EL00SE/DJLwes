// Thin wrapper around the Green Invoice (חשבונית ירוקה) REST API — plain
// fetch, no SDK, same pattern as lib/paypal.ts and lib/resend.ts. Issues
// the actual official receipt (קבלה, with the document number acting as
// its אסמכתה) once an order is confirmed. https://api.greeninvoice.co.il
//
// Defaults to Green Invoice's sandbox until GREEN_INVOICE_SANDBOX is
// explicitly set to "false" — issuing a real, numbered tax document is
// not reversible, so this should never happen by accident in dev/preview.
import { orderReference } from "@/lib/orders";
import type { OrderWithDetails } from "@/lib/orders";
import type { PaymentMethod } from "@prisma/client";

const apiId = process.env.GREEN_INVOICE_API_KEY;
const apiSecret = process.env.GREEN_INVOICE_API_SECRET;
const sandbox = process.env.GREEN_INVOICE_SANDBOX !== "false";
const baseUrl = sandbox
  ? "https://sandbox.d.greeninvoice.co.il/api/v1"
  : "https://api.greeninvoice.co.il/api/v1";

if (!apiId || !apiSecret) {
  console.warn(
    "GREEN_INVOICE_API_KEY / GREEN_INVOICE_API_SECRET are not set. Official receipts will be skipped until they're added to .env"
  );
}

// Document type 320 = חשבונית מס/קבלה (tax invoice + receipt in one
// document) — the right shape for a VAT-registered business collecting
// payment directly at the point of sale, rather than invoicing first and
// collecting later.
const DOCUMENT_TYPE_TAX_INVOICE_RECEIPT = 320;

// Green Invoice's payment.type codes.
const PAYMENT_TYPE_BY_METHOD: Record<PaymentMethod, number> = {
  PAYPAL: 5,
  BANK_TRANSFER: 4,
};

let cachedToken: { token: string; expiresAt: number } | null = null;

async function getToken(): Promise<string> {
  if (!apiId || !apiSecret) {
    throw new Error("Green Invoice is not configured (missing GREEN_INVOICE_API_KEY/SECRET)");
  }
  if (cachedToken && cachedToken.expiresAt > Date.now()) {
    return cachedToken.token;
  }

  const res = await fetch(`${baseUrl}/account/token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id: apiId, secret: apiSecret }),
  });
  if (!res.ok) {
    throw new Error(`Green Invoice auth failed: ${res.status} ${await res.text()}`);
  }
  const data: { token: string } = await res.json();
  // The token is a short-lived JWT; refreshing well before Green Invoice's
  // own ~24h expiry avoids ever handing out one that expires mid-request.
  cachedToken = { token: data.token, expiresAt: Date.now() + 12 * 60 * 60 * 1000 };
  return data.token;
}

export type ReceiptResult =
  | { ok: true; documentId: string; documentNumber: string; pdfUrl: string | null }
  | { ok: false; error: string };

/**
 * Issues an official receipt for a CONFIRMED order via Green Invoice.
 * Best-effort — never throws, so a Green Invoice outage or misconfigured
 * API key never blocks approving an order or sending the buyer's ticket.
 * Safe to call again for the same order (e.g. via the admin "Retry"
 * button); Green Invoice has no idea it's a retry, so each call issues
 * its own numbered document rather than updating a previous one.
 */
export async function issueReceipt(order: OrderWithDetails): Promise<ReceiptResult> {
  if (!apiId || !apiSecret) {
    return { ok: false, error: "Green Invoice is not configured" };
  }

  try {
    const token = await getToken();
    const today = new Date().toISOString().slice(0, 10);

    const res = await fetch(`${baseUrl}/documents`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        type: DOCUMENT_TYPE_TAX_INVOICE_RECEIPT,
        date: today,
        lang: "he",
        currency: "ILS",
        client: {
          name: order.customerName,
          emails: order.customerEmail ? [order.customerEmail] : [],
          add: false, // one-off ticket buyers shouldn't pile up as saved clients
        },
        income: order.items.map((item) => ({
          description: `${order.event.title} — ${item.ticketType.name}`,
          quantity: item.quantity,
          price: item.unitPriceCents / 100,
          currency: "ILS",
          vatType: 0,
        })),
        payment: [
          {
            type: PAYMENT_TYPE_BY_METHOD[order.paymentMethod],
            price: order.totalCents / 100,
            currency: "ILS",
            date: today,
          },
        ],
        remarks: `Order ${orderReference(order.id)}`,
      }),
    });

    const body = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: `Green Invoice API error: ${res.status} ${JSON.stringify(body)}` };
    }

    return {
      ok: true,
      documentId: String(body.id ?? ""),
      documentNumber: String(body.number ?? body.documentNumber ?? ""),
      pdfUrl: body.url?.origin ?? body.url?.he ?? (typeof body.url === "string" ? body.url : null),
    };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
