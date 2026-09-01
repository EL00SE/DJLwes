// Thin wrapper around PayPal's REST API (Orders v2) — no SDK dependency,
// just fetch. https://developer.paypal.com/docs/api/orders/v2/
//
// Only refundPayPalCapture below is still live (admin/actions.ts uses it
// to refund a declined order). createPayPalOrder, capturePayPalOrder,
// findApproveLink, and verifyWebhookSignature are UNUSED — they only
// serve the in-app checkout flow (api/checkout, api/webhooks/paypal),
// which is dormant since ticket sales moved to a Grow-hosted link.
const clientId = process.env.PAYPAL_CLIENT_ID;
const clientSecret = process.env.PAYPAL_CLIENT_SECRET;
// "sandbox" (default, for testing) or "live".
const env = process.env.PAYPAL_ENV === "live" ? "live" : "sandbox";
const apiBase =
  env === "live" ? "https://api-m.paypal.com" : "https://api-m.sandbox.paypal.com";

if (!clientId || !clientSecret) {
  console.warn(
    "PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET are not set. Checkout routes will fail until they're added to .env"
  );
}

async function getAccessToken(): Promise<string> {
  const res = await fetch(`${apiBase}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`PayPal auth failed: ${res.status} ${await res.text()}`);
  }
  const data = await res.json();
  return data.access_token as string;
}

async function paypalFetch(path: string, init: RequestInit = {}) {
  const token = await getAccessToken();
  const res = await fetch(`${apiBase}${path}`, {
    ...init,
    headers: {
      ...init.headers,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    throw new Error(`PayPal API error (${path}): ${res.status} ${JSON.stringify(data)}`);
  }
  return data;
}

export type PayPalOrder = {
  id: string;
  status: string;
  links: { rel: string; href: string; method: string }[];
  purchase_units?: {
    payments?: {
      captures?: { id: string; status: string }[];
    };
  }[];
};

/**
 * Creates a PayPal order for a single line item and returns it — including
 * the `links` array, which has the `approve` URL to redirect the buyer to.
 */
export async function createPayPalOrder(params: {
  referenceId: string;
  description: string;
  amountCents: number;
  currency?: string;
  returnUrl: string;
  cancelUrl: string;
}): Promise<PayPalOrder> {
  const { referenceId, description, amountCents, returnUrl, cancelUrl } = params;
  const currency = params.currency ?? "USD";

  return paypalFetch("/v2/checkout/orders", {
    method: "POST",
    body: JSON.stringify({
      intent: "CAPTURE",
      purchase_units: [
        {
          reference_id: referenceId,
          // Round-trips onto the resulting Capture resource, so the
          // webhook can map an incoming event straight back to our order
          // without a secondary lookup.
          custom_id: referenceId,
          description,
          amount: {
            currency_code: currency,
            value: (amountCents / 100).toFixed(2),
          },
        },
      ],
      application_context: {
        brand_name: "DJ Lwes",
        user_action: "PAY_NOW",
        return_url: returnUrl,
        cancel_url: cancelUrl,
      },
    }),
  });
}

export async function getPayPalOrder(orderId: string): Promise<PayPalOrder> {
  return paypalFetch(`/v2/checkout/orders/${orderId}`, { method: "GET" });
}

/** Captures an approved order. Safe to call once per order — PayPal 422s on a repeat capture, which callers should treat as "already captured". */
export async function capturePayPalOrder(orderId: string): Promise<PayPalOrder> {
  return paypalFetch(`/v2/checkout/orders/${orderId}/capture`, { method: "POST" });
}

export function findApproveLink(order: PayPalOrder): string | null {
  return order.links.find((link) => link.rel === "approve")?.href ?? null;
}

/**
 * Fully refunds a capture. Used when a payment succeeds but we can no
 * longer fulfill the order (e.g. lost a race against the last ticket) —
 * we should never keep money for a ticket we didn't deliver.
 */
export async function refundPayPalCapture(captureId: string) {
  return paypalFetch(`/v2/payments/captures/${captureId}/refund`, {
    method: "POST",
    body: JSON.stringify({ note_to_payer: "Ticket sold out before payment completed." }),
  });
}

/**
 * Asks PayPal to verify that an incoming webhook request really came from
 * them (rather than someone POSTing a forged "payment completed" body at
 * our endpoint) — the standard PayPal webhook verification API. Must be
 * called before trusting anything in the event body.
 * https://developer.paypal.com/docs/api/webhooks/v1/#verify-webhook-signature
 */
export async function verifyWebhookSignature(params: {
  authAlgo: string;
  certUrl: string;
  transmissionId: string;
  transmissionSig: string;
  transmissionTime: string;
  webhookId: string;
  webhookEvent: unknown;
}): Promise<string> {
  const data = await paypalFetch("/v1/notifications/verify-webhook-signature", {
    method: "POST",
    body: JSON.stringify({
      auth_algo: params.authAlgo,
      cert_url: params.certUrl,
      transmission_id: params.transmissionId,
      transmission_sig: params.transmissionSig,
      transmission_time: params.transmissionTime,
      webhook_id: params.webhookId,
      webhook_event: params.webhookEvent,
    }),
  });
  // Raw status string ("SUCCESS" / "FAILURE") rather than a boolean, so
  // callers can log exactly what PayPal said rather than just yes/no —
  // there's no other way to see this after the fact (see WebhookLog).
  return data.verification_status as string;
}
