// Thin wrapper around PayPal's REST API (Orders v2) — no SDK dependency,
// just fetch. https://developer.paypal.com/docs/api/orders/v2/
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
