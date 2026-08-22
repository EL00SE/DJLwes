// Thin wrapper around Resend's REST API — plain fetch, no SDK, same
// pattern as lib/paypal.ts. https://resend.com/docs/api-reference/emails/send-email
const apiKey = process.env.RESEND_API_KEY;
// resend.dev is Resend's shared sandbox sender — works immediately with
// no domain setup, fine for now. Once you verify your own domain with
// Resend, switch this to something like "tickets@etfeelboiler.com".
const fromAddress = process.env.RESEND_FROM_EMAIL ?? "Etfe El Boiler <onboarding@resend.dev>";

if (!apiKey) {
  console.warn(
    "RESEND_API_KEY is not set. Order-confirmation emails will be skipped until it's added to .env"
  );
}

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  /** Base64-encoded file contents — e.g. a ticket's QR code, attached as a
   * real file since some email clients strip inline data: URIs from the
   * html body. */
  attachments?: { filename: string; content: string }[];
}) {
  if (!apiKey) {
    throw new Error("RESEND_API_KEY is not configured");
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: fromAddress,
      to: params.to,
      subject: params.subject,
      html: params.html,
      attachments: params.attachments,
    }),
  });

  if (!res.ok) {
    throw new Error(`Resend API error: ${res.status} ${await res.text()}`);
  }

  return res.json();
}
