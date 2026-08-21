import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebhookSignature } from "@/lib/paypal";
import { fulfillOrder, markOrderRefundedExternally } from "@/lib/fulfill-order";

// PayPal event types we act on. Anything else is acknowledged (200) and
// ignored, so PayPal doesn't keep retrying events we don't care about.
const CAPTURE_COMPLETED = "PAYMENT.CAPTURE.COMPLETED";
const CAPTURE_REFUNDED = "PAYMENT.CAPTURE.REFUNDED";
const CAPTURE_REVERSED = "PAYMENT.CAPTURE.REVERSED";

type CaptureResource = {
  id?: string;
  custom_id?: string;
  supplementary_data?: { related_ids?: { order_id?: string } };
};

/** Maps a Capture webhook resource back to our internal order id. Prefers
 * `custom_id` (we set it explicitly to our order id at checkout time —
 * see lib/paypal.ts's createPayPalOrder), falling back to matching the
 * PayPal order id against our stored paypalOrderId, for orders created
 * before custom_id was added. */
async function resolveOrderId(resource: CaptureResource): Promise<string | null> {
  if (resource.custom_id) return resource.custom_id;

  const paypalOrderId = resource.supplementary_data?.related_ids?.order_id;
  if (!paypalOrderId) return null;

  const order = await prisma.order.findUnique({
    where: { paypalOrderId },
    select: { id: true },
  });
  return order?.id ?? null;
}

export async function POST(request: Request) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) {
    console.error("PAYPAL_WEBHOOK_ID is not set — rejecting webhook (see README's webhook setup).");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 503 });
  }

  const authAlgo = request.headers.get("paypal-auth-algo");
  const certUrl = request.headers.get("paypal-cert-url");
  const transmissionId = request.headers.get("paypal-transmission-id");
  const transmissionSig = request.headers.get("paypal-transmission-sig");
  const transmissionTime = request.headers.get("paypal-transmission-time");

  if (!authAlgo || !certUrl || !transmissionId || !transmissionSig || !transmissionTime) {
    return NextResponse.json({ error: "Missing PayPal signature headers" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: { event_type?: string; resource?: CaptureResource };
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Verify with PayPal that this request genuinely came from them before
  // trusting anything in the body — otherwise anyone could POST a forged
  // "payment completed" event straight at this endpoint.
  let verified = false;
  try {
    verified = await verifyWebhookSignature({
      authAlgo,
      certUrl,
      transmissionId,
      transmissionSig,
      transmissionTime,
      webhookId,
      webhookEvent: event,
    });
  } catch (err) {
    console.error("PayPal webhook signature verification request failed:", err);
    return NextResponse.json({ error: "Verification failed" }, { status: 400 });
  }

  if (!verified) {
    console.error("PayPal webhook signature verification returned FAILURE — rejecting.", {
      transmissionId,
      eventType: event.event_type,
    });
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const eventType = event.event_type;
  const resource = event.resource;

  if (
    (eventType === CAPTURE_COMPLETED || eventType === CAPTURE_REFUNDED || eventType === CAPTURE_REVERSED) &&
    resource
  ) {
    const orderId = await resolveOrderId(resource);
    if (!orderId) {
      console.error(`PayPal webhook ${eventType} — couldn't resolve an order for capture ${resource.id}.`);
      // Still 200 — this isn't a signature/retry problem, just an event
      // we can't act on (e.g. a capture from before custom_id existed).
      return NextResponse.json({ received: true });
    }

    try {
      if (eventType === CAPTURE_COMPLETED) {
        await fulfillOrder(orderId, resource.id ?? null);
      } else {
        await markOrderRefundedExternally(orderId);
      }
    } catch (err) {
      console.error(`Failed to process PayPal webhook ${eventType} for order ${orderId}:`, err);
      return NextResponse.json({ error: "Processing failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ received: true });
}
