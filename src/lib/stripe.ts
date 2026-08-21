import Stripe from "stripe";

const secretKey = process.env.STRIPE_SECRET_KEY;

if (!secretKey) {
  // Thrown lazily (only when a route actually touches Stripe) so the rest
  // of the app — and `next build` — still works before keys are configured.
  console.warn(
    "STRIPE_SECRET_KEY is not set. Checkout routes will fail until it's added to .env"
  );
}

export const stripe = new Stripe(secretKey ?? "sk_test_placeholder", {
  apiVersion: "2026-07-29.dahlia",
  typescript: true,
});
