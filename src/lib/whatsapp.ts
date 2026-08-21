// Thin wrapper around Meta's WhatsApp Business Cloud API — plain fetch,
// no SDK. https://developers.facebook.com/docs/whatsapp/cloud-api
//
// Unlike email, WhatsApp won't let a business send arbitrary freeform
// text as the *first* message to someone — only a pre-approved message
// "template" (Meta reviews and approves template content in advance).
// See WHATSAPP_TEMPLATE_NAME below for what to submit for approval.
const accessToken = process.env.WHATSAPP_ACCESS_TOKEN;
const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID;
const templateName = process.env.WHATSAPP_TEMPLATE_NAME ?? "ticket_confirmation";

if (!accessToken || !phoneNumberId) {
  console.warn(
    "WHATSAPP_ACCESS_TOKEN / WHATSAPP_PHONE_NUMBER_ID are not set. WhatsApp confirmations will be skipped until they're added to .env"
  );
}

/**
 * Sends the approved `ticket_confirmation` template to `to` (E.164 phone
 * number, e.g. "+972501234567"). The template must already exist and be
 * approved in Meta Business Manager with this exact parameter order —
 * see the README for the exact text to submit for approval.
 */
export async function sendWhatsAppTicketConfirmation(params: {
  to: string;
  customerName: string;
  eventTitle: string;
  ticketSummary: string; // e.g. "2 x General Admission"
  total: string; // pre-formatted, e.g. "$70"
}) {
  if (!accessToken || !phoneNumberId) {
    throw new Error("WhatsApp is not configured (missing WHATSAPP_ACCESS_TOKEN/WHATSAPP_PHONE_NUMBER_ID)");
  }

  const res = await fetch(`https://graph.facebook.com/v21.0/${phoneNumberId}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      messaging_product: "whatsapp",
      to: params.to.replace(/[^\d+]/g, ""),
      type: "template",
      template: {
        name: templateName,
        language: { code: "en" },
        components: [
          {
            type: "body",
            parameters: [
              { type: "text", text: params.customerName },
              { type: "text", text: params.eventTitle },
              { type: "text", text: params.ticketSummary },
              { type: "text", text: params.total },
            ],
          },
        ],
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`WhatsApp API error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
