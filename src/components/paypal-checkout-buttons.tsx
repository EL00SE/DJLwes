"use client";

import { useEffect, useRef, useState } from "react";

export type CheckoutPayload = {
  eventId: string;
  ticketTypeId: string;
  quantity: number;
  name: string;
  instagram: string;
  contactMethod: "EMAIL" | "WHATSAPP";
  email: string;
  phone: string;
  paymentMethod: "PAYPAL";
};

type Checkout = { payload: CheckoutPayload; totalCents: number; description: string };

// Minimal shapes for the third-party globals this component drives —
// typed just enough to cover what's actually called here, since none of
// PayPal/Apple/Google publish first-party TypeScript types for these.
interface PayPalButtonsOptions {
  style?: Record<string, string>;
  createOrder: () => Promise<string>;
  onApprove: (data: { orderID: string }) => Promise<void>;
  onError?: (err: unknown) => void;
}
interface ApplePayConfig {
  isEligible: boolean;
  countryCode: string;
  merchantCapabilities: string[];
  supportedNetworks: string[];
}
interface ApplePayComponent {
  config: () => Promise<ApplePayConfig>;
  validateMerchant: (params: {
    validationUrl: string;
    displayName?: string;
  }) => Promise<{ merchantSession: unknown }>;
  confirmOrder: (params: { orderId: string; token: unknown; billingContact?: unknown }) => Promise<unknown>;
}
interface GooglePayConfig {
  allowedPaymentMethods: unknown[];
  merchantInfo: unknown;
}
interface GooglePayComponent {
  config: () => Promise<GooglePayConfig>;
  confirmOrder: (params: { orderId: string; paymentMethodData: unknown }) => Promise<{ status: string }>;
}
interface PayPalNamespace {
  Buttons: (options: PayPalButtonsOptions) => { render: (container: HTMLElement) => Promise<void> };
  Applepay: () => ApplePayComponent;
  Googlepay: () => GooglePayComponent;
}
interface ApplePaySessionInstance {
  begin: () => void;
  abort: () => void;
  completeMerchantValidation: (session: unknown) => void;
  completePayment: (status: number) => void;
  onvalidatemerchant: ((event: { validationURL: string }) => void) | null;
  onpaymentauthorized: ((event: { payment: { token: unknown; billingContact?: unknown } }) => void) | null;
}
interface ApplePaySessionCtor {
  new (version: number, request: Record<string, unknown>): ApplePaySessionInstance;
  canMakePayments: () => boolean;
  STATUS_SUCCESS: number;
  STATUS_FAILURE: number;
}
interface GooglePaymentsClient {
  isReadyToPay: (request: Record<string, unknown>) => Promise<{ result: boolean }>;
  createButton: (options: { onClick: () => void; buttonColor?: string; buttonType?: string }) => HTMLElement;
  loadPaymentData: (request: Record<string, unknown>) => Promise<unknown>;
}
declare global {
  interface Window {
    paypal?: PayPalNamespace;
    ApplePaySession?: ApplePaySessionCtor;
    google?: { payments: { api: { PaymentsClient: new (options: Record<string, unknown>) => GooglePaymentsClient } } };
  }
}

// Caches the load Promise itself (not just "is a <script> tag present"),
// keyed by src, at module scope — shared across every mount. Without
// this, React's dev-mode double-invoke of effects (mount → cleanup →
// mount again) would see the first mount's <script> tag already present
// on the second mount and resolve immediately, racing ahead of the tag's
// own load event and leaving window.paypal briefly undefined.
const scriptLoadPromises = new Map<string, Promise<void>>();

function loadScript(src: string): Promise<void> {
  const cached = scriptLoadPromises.get(src);
  if (cached) return cached;

  const promise = new Promise<void>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load script: ${src}`));
    document.head.appendChild(script);
  });

  scriptLoadPromises.set(src, promise);
  return promise;
}

const PAYPAL_ENV_IS_LIVE = process.env.NEXT_PUBLIC_PAYPAL_ENV === "live";

/**
 * Renders PayPal's embedded Smart Buttons (PayPal/Venmo), plus — where the
 * buyer's browser/device and this account are eligible — Apple Pay and
 * Google Pay buttons alongside them. All three converge on the same
 * backend: /api/checkout creates the PayPal order, then each funding
 * source's own confirmation step (or none, for the standard button) hands
 * off to /api/checkout/[orderId]/capture. See src/lib/paypal.ts.
 *
 * Mounts once and never re-renders its buttons — `getCheckout` is called
 * fresh at the moment the buyer actually commits to a payment method, so
 * it always reflects the current ticket type/quantity/contact fields
 * without this component needing to know when any of that changes.
 */
export function PayPalCheckoutButtons({
  merchantDisplayName,
  getCheckout,
  onError,
  onSuccess,
}: {
  merchantDisplayName: string;
  getCheckout: () => Checkout | null;
  onError: (message: string) => void;
  onSuccess: (orderId: string) => void;
}) {
  const paypalContainerRef = useRef<HTMLDivElement | null>(null);
  const applePayContainerRef = useRef<HTMLDivElement | null>(null);
  const googlePayContainerRef = useRef<HTMLDivElement | null>(null);
  const orderIdRef = useRef<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // Lets the SDK callbacks below (registered once) always read current
  // props without the setup effect needing to depend on them.
  const latest = useRef({ getCheckout, onError, onSuccess, merchantDisplayName });
  useEffect(() => {
    latest.current = { getCheckout, onError, onSuccess, merchantDisplayName };
  });

  async function createServerOrder(): Promise<{ orderId: string; paypalOrderId: string; totalCents: number }> {
    const checkout = latest.current.getCheckout();
    if (!checkout) throw new Error("Please fill in the required fields first.");
    const res = await fetch("/api/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(checkout.payload),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not start checkout.");
    return { orderId: data.orderId, paypalOrderId: data.paypalOrderId, totalCents: checkout.totalCents };
  }

  async function captureServerOrder(orderId: string): Promise<void> {
    const res = await fetch(`/api/checkout/${orderId}/capture`, { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error ?? "Could not confirm payment.");
  }

  useEffect(() => {
    let cancelled = false;

    async function setup() {
      const clientId = process.env.NEXT_PUBLIC_PAYPAL_CLIENT_ID;
      if (!clientId) {
        latest.current.onError("PayPal isn't configured on this site yet.");
        return;
      }

      try {
        await loadScript(
          `https://www.paypal.com/sdk/js?client-id=${encodeURIComponent(clientId)}&currency=USD&intent=capture&components=buttons,applepay,googlepay`
        );
      } catch {
        latest.current.onError("Could not load PayPal.");
        return;
      }
      if (cancelled || !window.paypal || !paypalContainerRef.current) return;
      const paypal = window.paypal;

      paypal
        .Buttons({
          style: { layout: "vertical", label: "paypal" },
          createOrder: async () => {
            const order = await createServerOrder();
            orderIdRef.current = order.orderId;
            return order.paypalOrderId;
          },
          onApprove: async () => {
            const orderId = orderIdRef.current;
            if (!orderId) return;
            setIsProcessing(true);
            try {
              await captureServerOrder(orderId);
              latest.current.onSuccess(orderId);
            } catch (err) {
              latest.current.onError(err instanceof Error ? err.message : "Could not confirm payment.");
            } finally {
              setIsProcessing(false);
            }
          },
          onError: (err) => {
            latest.current.onError(err instanceof Error ? err.message : "PayPal checkout failed.");
          },
        })
        .render(paypalContainerRef.current)
        .catch(() => {
          // Not eligible in this browser/account — the buyer still has
          // Apple Pay/Google Pay (if eligible) or bank transfer.
        });

      // Best-effort — neither should ever block the standard button above.
      setupApplePay(paypal).catch(() => {});
      setupGooglePay(paypal).catch(() => {});
    }

    async function setupApplePay(paypal: PayPalNamespace) {
      const container = applePayContainerRef.current;
      const ApplePaySessionCtor = window.ApplePaySession;
      if (!container || !ApplePaySessionCtor || !ApplePaySessionCtor.canMakePayments()) return;

      await loadScript("https://applepay.cdn-apple.com/jsapi/1.latest/apple-pay-sdk.js");
      const applepay = paypal.Applepay();
      const config = await applepay.config();
      if (cancelled || !config.isEligible) return;

      container.innerHTML = '<apple-pay-button buttonstyle="black" type="buy" locale="en"></apple-pay-button>';
      container.querySelector("apple-pay-button")?.addEventListener("click", () => {
        const checkout = latest.current.getCheckout();
        if (!checkout) {
          latest.current.onError("Please fill in the required fields first.");
          return;
        }

        const session = new ApplePaySessionCtor(4, {
          countryCode: config.countryCode,
          currencyCode: "USD",
          merchantCapabilities: config.merchantCapabilities,
          supportedNetworks: config.supportedNetworks,
          requiredBillingContactFields: ["postalAddress"],
          total: { label: checkout.description, type: "final", amount: (checkout.totalCents / 100).toFixed(2) },
        });

        session.onvalidatemerchant = (event) => {
          applepay
            .validateMerchant({ validationUrl: event.validationURL, displayName: latest.current.merchantDisplayName })
            .then((result) => session.completeMerchantValidation(result.merchantSession))
            .catch(() => session.abort());
        };

        session.onpaymentauthorized = async (event) => {
          try {
            const order = await createServerOrder();
            await applepay.confirmOrder({
              orderId: order.paypalOrderId,
              token: event.payment.token,
              billingContact: event.payment.billingContact,
            });
            session.completePayment(ApplePaySessionCtor.STATUS_SUCCESS);
            setIsProcessing(true);
            await captureServerOrder(order.orderId);
            latest.current.onSuccess(order.orderId);
          } catch (err) {
            session.completePayment(ApplePaySessionCtor.STATUS_FAILURE);
            latest.current.onError(err instanceof Error ? err.message : "Apple Pay payment failed.");
          } finally {
            setIsProcessing(false);
          }
        };

        session.begin();
      });
    }

    async function setupGooglePay(paypal: PayPalNamespace) {
      const container = googlePayContainerRef.current;
      if (!container) return;

      await loadScript("https://pay.google.com/gp/p/js/pay.js");
      if (cancelled || !window.google) return;

      const googlepay = paypal.Googlepay();
      const config = await googlepay.config();
      if (cancelled) return;

      const paymentsClient = new window.google.payments.api.PaymentsClient({
        environment: PAYPAL_ENV_IS_LIVE ? "PRODUCTION" : "TEST",
        paymentDataCallbacks: {
          onPaymentAuthorized: async (paymentData: { paymentMethodData: unknown }) => {
            try {
              const order = await createServerOrder();
              const confirmResult = await googlepay.confirmOrder({
                orderId: order.paypalOrderId,
                paymentMethodData: paymentData.paymentMethodData,
              });
              if (confirmResult.status !== "APPROVED" && confirmResult.status !== "COMPLETED") {
                throw new Error(`Google Pay order was not approved (status: ${confirmResult.status}).`);
              }
              setIsProcessing(true);
              await captureServerOrder(order.orderId);
              latest.current.onSuccess(order.orderId);
              return { transactionState: "SUCCESS" };
            } catch (err) {
              const message = err instanceof Error ? err.message : "Google Pay payment failed.";
              latest.current.onError(message);
              return { transactionState: "ERROR", error: { intent: "PAYMENT_AUTHORIZATION", message } };
            } finally {
              setIsProcessing(false);
            }
          },
        },
      });

      const isReady = await paymentsClient.isReadyToPay({
        apiVersion: 2,
        apiVersionMinor: 0,
        allowedPaymentMethods: config.allowedPaymentMethods,
      });
      if (cancelled || !isReady.result || !container) return;

      const button = paymentsClient.createButton({
        buttonColor: "black",
        buttonType: "pay",
        onClick: () => {
          const checkout = latest.current.getCheckout();
          if (!checkout) {
            latest.current.onError("Please fill in the required fields first.");
            return;
          }
          paymentsClient
            .loadPaymentData({
              apiVersion: 2,
              apiVersionMinor: 0,
              allowedPaymentMethods: config.allowedPaymentMethods,
              merchantInfo: config.merchantInfo,
              transactionInfo: {
                currencyCode: "USD",
                totalPriceStatus: "FINAL",
                totalPrice: (checkout.totalCents / 100).toFixed(2),
              },
              callbackIntents: ["PAYMENT_AUTHORIZATION"],
            })
            .catch((err: unknown) => {
              // The buyer closing the Google Pay sheet also rejects this
              // promise — not a real failure, so don't surface it.
              const canceled =
                typeof err === "object" && err !== null && "statusCode" in err && err.statusCode === "CANCELED";
              if (!canceled) {
                latest.current.onError(err instanceof Error ? err.message : "Google Pay failed to open.");
              }
            });
        },
      });
      container.appendChild(button);
    }

    setup();
    return () => {
      cancelled = true;
    };
    // Intentionally empty — everything above reads through `latest`, so
    // the SDKs and their buttons are wired up exactly once per mount.
  }, []);

  return (
    <div className="flex flex-col gap-2">
      <div ref={paypalContainerRef} />
      <div ref={applePayContainerRef} className="empty:hidden" />
      <div ref={googlePayContainerRef} className="empty:hidden" />
      {isProcessing && (
        <p className="text-center font-mono text-xs uppercase tracking-[0.15em] text-ink-faint">
          Confirming your payment…
        </p>
      )}
    </div>
  );
}
