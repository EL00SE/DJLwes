"use client";

import { useMemo, useRef, useState } from "react";
import { formatPrice } from "@/lib/format";
import { COUNTRY_CODES, DEFAULT_COUNTRY_DIAL_CODE, countryFlagEmoji } from "@/lib/country-codes";
import type { TicketTypeSummary } from "@/components/ticket-type-card";
import { PayPalCheckoutButtons } from "@/components/paypal-checkout-buttons";

// Matches the server-side check in api/checkout/route.ts. Instagram has no
// public API for searching/autocompleting arbitrary handles, so this is a
// format check + a "go double-check it yourself" link, not a live lookup.
const INSTAGRAM_HANDLE_PATTERN = /^@?[A-Za-z0-9._]+$/;

export function BuyPanel({
  eventId,
  eventTitle,
  ticketTypes,
  selectedTicketTypeId,
  onSelectTicketType,
  panelRef,
}: {
  eventId: string;
  eventTitle: string;
  ticketTypes: TicketTypeSummary[];
  selectedTicketTypeId: string | null;
  onSelectTicketType: (id: string) => void;
  panelRef?: React.Ref<HTMLDivElement>;
}) {
  const [quantity, setQuantity] = useState(1);
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"PAYPAL" | "BANK_TRANSFER">("PAYPAL");
  const [contactMethod, setContactMethod] = useState<"EMAIL" | "WHATSAPP">("EMAIL");
  const [email, setEmail] = useState("");
  const [countryDialCode, setCountryDialCode] = useState(DEFAULT_COUNTRY_DIAL_CODE);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const selectedTicketType = useMemo(
    () => ticketTypes.find((t) => t.id === selectedTicketTypeId) ?? null,
    [ticketTypes, selectedTicketTypeId]
  );

  // Switching ticket types resets the quantity — otherwise a quantity
  // picked for one type (e.g. 8, when 10 were left) could silently exceed
  // a different type's stock (e.g. only 2 left) after switching, showing
  // a total that doesn't match what checkout would actually charge.
  // Adjusting state during render (rather than in an effect) is the
  // React-recommended pattern for this: https://react.dev/learn/you-might-not-need-an-effect#adjusting-some-state-when-a-prop-changes
  const [prevSelectedTicketTypeId, setPrevSelectedTicketTypeId] = useState(selectedTicketTypeId);
  if (selectedTicketTypeId !== prevSelectedTicketTypeId) {
    setPrevSelectedTicketTypeId(selectedTicketTypeId);
    setQuantity(1);
  }

  const maxQuantity = selectedTicketType ? Math.min(10, selectedTicketType.quantityRemaining) : 1;
  const total = selectedTicketType ? selectedTicketType.priceCents * quantity : 0;

  function goToSuccessPage(orderId: string) {
    window.location.href = `/checkout/success?orderId=${orderId}`;
  }

  /** Builds the checkout request body for the PayPal/Apple Pay/Google Pay
   * buttons (see paypal-checkout-buttons.tsx) — called fresh at the
   * moment the buyer commits to a wallet, so it always reflects whatever
   * is currently in the form. reportValidity() re-runs the same required-
   * field checks the (bank transfer) form's native submit would, since
   * this path never actually submits the <form>. */
  function getCheckout() {
    if (!selectedTicketType || !formRef.current?.reportValidity()) return null;
    const phone = contactMethod === "WHATSAPP" ? `${countryDialCode} ${phoneLocal.trim()}`.trim() : "";
    return {
      payload: {
        eventId,
        ticketTypeId: selectedTicketType.id,
        quantity,
        name,
        instagram,
        contactMethod,
        email,
        phone,
        paymentMethod: "PAYPAL" as const,
      },
      totalCents: total,
      description: `${eventTitle} — ${quantity} × ${selectedTicketType.name}`,
    };
  }

  /** Bank transfer only — PayPal/Apple Pay/Google Pay never submit this
   * form; they hand off to /api/checkout on their own (see getCheckout). */
  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    // Guards against an Enter-key press submitting the form while PayPal
    // is selected — that path has no submit button and is handled
    // entirely by PayPalCheckoutButtons instead (see getCheckout above).
    if (paymentMethod !== "BANK_TRANSFER") return;
    if (!selectedTicketType) {
      setError("Pick a ticket type to continue.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const phone =
        contactMethod === "WHATSAPP" ? `${countryDialCode} ${phoneLocal.trim()}`.trim() : "";
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId,
          ticketTypeId: selectedTicketType.id,
          quantity,
          name,
          instagram,
          contactMethod,
          email,
          phone,
          paymentMethod: "BANK_TRANSFER",
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      goToSuccessPage(data.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setIsSubmitting(false);
    }
  }

  return (
    <div
      ref={panelRef}
      className="card-edge sticky top-24 rounded-3xl border border-line p-6 shadow-[0_0_60px_-25px_rgba(177,59,255,0.6)] sm:p-8"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-bright">
        Get tickets
      </p>
      <h2 className="mt-1 font-display text-3xl tracking-wide text-ink">{eventTitle}</h2>

      {!selectedTicketType ? (
        <p className="mt-6 text-sm text-ink-muted">
          Select a ticket type on the left to get started.
        </p>
      ) : (
        <form ref={formRef} onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <div className="flex items-center justify-between rounded-2xl border border-line bg-bg/60 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ink">{selectedTicketType.name}</p>
              <p className="font-mono text-xs text-ink-faint">
                {formatPrice(selectedTicketType.priceCents)} each
              </p>
            </div>
            {ticketTypes.length > 1 && (
              <div className="flex flex-wrap justify-end gap-1">
                {ticketTypes.map((t) => (
                  <button
                    type="button"
                    key={t.id}
                    onClick={() => onSelectTicketType(t.id)}
                    className={`rounded-full px-2.5 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors ${
                      t.id === selectedTicketType.id
                        ? "bg-accent-dim text-accent-bright"
                        : "text-ink-faint hover:text-ink-muted"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              Quantity
            </span>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="h-11 w-11 rounded-full border border-line-strong text-ink transition-colors hover:border-accent hover:text-accent-bright"
                aria-label="Decrease quantity"
              >
                −
              </button>
              <span className="w-6 text-center font-display text-xl">{quantity}</span>
              <button
                type="button"
                onClick={() => setQuantity((q) => Math.min(maxQuantity, q + 1))}
                className="h-11 w-11 rounded-full border border-line-strong text-ink transition-colors hover:border-accent hover:text-accent-bright"
                aria-label="Increase quantity"
              >
                +
              </button>
            </div>
          </label>

          <div className="flex flex-col gap-5">
            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                Full name
              </span>
              <input
                required
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
              />
            </label>

            <label className="flex flex-col gap-1.5 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                Instagram
              </span>
              <input
                required
                type="text"
                value={instagram}
                onChange={(e) => setInstagram(e.target.value)}
                placeholder="@yourhandle"
                className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
              />
              {INSTAGRAM_HANDLE_PATTERN.test(instagram.trim()) && (
                <a
                  href={`https://instagram.com/${instagram.trim().replace(/^@/, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="self-start font-mono text-[11px] text-accent-bright hover:underline"
                >
                  → View @{instagram.trim().replace(/^@/, "")} on Instagram, to double-check
                </a>
              )}
            </label>

            <div className="flex flex-col gap-1.5 text-sm">
              <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                Send my ticket via
              </span>
              <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-bg/60 p-1">
                {(
                  [
                    { value: "EMAIL", label: "Email" },
                    { value: "WHATSAPP", label: "WhatsApp" },
                  ] as const
                ).map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => setContactMethod(option.value)}
                    aria-pressed={contactMethod === option.value}
                    className={`rounded-lg py-2 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
                      contactMethod === option.value
                        ? "bg-accent text-white"
                        : "text-ink-muted hover:text-ink"
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {contactMethod === "EMAIL" ? (
              <label className="flex flex-col gap-1.5 text-sm">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                  Email
                </span>
                <input
                  required
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
                />
              </label>
            ) : (
              <div className="flex flex-col gap-1.5 text-sm">
                <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
                  WhatsApp number
                </span>
                <div className="flex gap-2">
                  <select
                    value={countryDialCode}
                    onChange={(e) => setCountryDialCode(e.target.value)}
                    aria-label="Country code"
                    className="w-[6.5rem] shrink-0 rounded-xl border border-line bg-bg/60 px-2 py-2.5 text-ink outline-none transition-colors focus:border-accent"
                  >
                    {COUNTRY_CODES.map((country) => (
                      <option key={`${country.iso}-${country.dialCode}`} value={country.dialCode}>
                        {countryFlagEmoji(country.iso)} {country.dialCode}
                      </option>
                    ))}
                  </select>
                  <input
                    required
                    type="tel"
                    value={phoneLocal}
                    onChange={(e) => setPhoneLocal(e.target.value)}
                    placeholder="50 123 4567"
                    className="min-w-0 flex-1 rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              Pay with
            </span>
            <div className="grid grid-cols-2 gap-1 rounded-xl border border-line bg-bg/60 p-1">
              {(
                [
                  { value: "PAYPAL", label: "PayPal" },
                  { value: "BANK_TRANSFER", label: "Bank Transfer" },
                ] as const
              ).map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setPaymentMethod(option.value)}
                  aria-pressed={paymentMethod === option.value}
                  className={`rounded-lg py-2 font-mono text-xs uppercase tracking-[0.1em] transition-colors ${
                    paymentMethod === option.value
                      ? "bg-accent text-white"
                      : "text-ink-muted hover:text-ink"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {paymentMethod === "BANK_TRANSFER" && (
              <p className="text-xs text-ink-faint">
                You&apos;ll get our bank details and a reference to include — we confirm receipt by
                hand, so this takes a little longer than PayPal.
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
              Total
            </span>
            <span className="font-display text-3xl text-ink">{formatPrice(total)}</span>
          </div>

          {error && <p className="text-sm text-magenta">{error}</p>}

          {paymentMethod === "PAYPAL" ? (
            <>
              <PayPalCheckoutButtons
                merchantDisplayName="DJ Lwes"
                getCheckout={getCheckout}
                onError={setError}
                onSuccess={goToSuccessPage}
              />
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                Secure checkout powered by PayPal
              </p>
            </>
          ) : (
            <>
              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-full bg-accent px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-white shadow-[0_0_30px_-6px_var(--color-accent)] transition-opacity hover:opacity-90 disabled:opacity-50"
              >
                {isSubmitting ? "Submitting…" : "Request Bank Transfer"}
              </button>
              <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
                No payment taken yet — you&apos;ll see our bank details next
              </p>
            </>
          )}
        </form>
      )}
    </div>
  );
}
