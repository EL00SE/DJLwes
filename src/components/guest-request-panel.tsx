"use client";

import { useState } from "react";
import { COUNTRY_CODES, DEFAULT_COUNTRY_DIAL_CODE, countryFlagEmoji } from "@/lib/country-codes";

const INSTAGRAM_HANDLE_PATTERN = /^@?[A-Za-z0-9._]+$/;

function CountInput({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (next: number) => void;
}) {
  return (
    <label className="flex flex-col items-center gap-1.5 text-sm">
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">{label}</span>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => onChange(Math.max(0, value - 1))}
          className="h-9 w-9 rounded-full border border-line-strong text-ink transition-colors hover:border-accent hover:text-accent-bright"
          aria-label={`Decrease ${label}`}
        >
          −
        </button>
        <span className="w-6 text-center font-display text-lg">{value}</span>
        <button
          type="button"
          onClick={() => onChange(Math.min(50, value + 1))}
          className="h-9 w-9 rounded-full border border-line-strong text-ink transition-colors hover:border-accent hover:text-accent-bright"
          aria-label={`Increase ${label}`}
        >
          +
        </button>
      </div>
    </label>
  );
}

export function GuestRequestPanel({
  eventId,
  eventTitle,
  panelRef,
}: {
  eventId: string;
  eventTitle: string;
  panelRef?: React.Ref<HTMLDivElement>;
}) {
  const [name, setName] = useState("");
  const [instagram, setInstagram] = useState("");
  const [countryDialCode, setCountryDialCode] = useState(DEFAULT_COUNTRY_DIAL_CODE);
  const [phoneLocal, setPhoneLocal] = useState("");
  const [email, setEmail] = useState("");
  const [maleCount, setMaleCount] = useState(0);
  const [femaleCount, setFemaleCount] = useState(0);
  const [otherCount, setOtherCount] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const totalGuests = maleCount + femaleCount + otherCount;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (totalGuests < 1) {
      setError("Add at least one guest.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const phone = `${countryDialCode} ${phoneLocal.trim()}`.trim();
      const res = await fetch("/api/guest-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId, name, instagram, phone, email, maleCount, femaleCount, otherCount }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? "Something went wrong. Please try again.");
      }
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div
      ref={panelRef}
      className="card-edge sticky top-24 rounded-3xl border border-line p-6 shadow-[0_0_60px_-25px_rgba(177,59,255,0.6)] sm:p-8"
    >
      <p className="font-mono text-[10px] uppercase tracking-[0.25em] text-accent-bright">
        Request to join
      </p>
      <h2 className="mt-1 font-display text-3xl tracking-wide text-ink">{eventTitle}</h2>

      {submitted ? (
        <div role="status" className="mt-6 flex flex-col items-center gap-3 py-6 text-center">
          <p className="font-mono text-xs uppercase tracking-[0.3em] text-mint">Request sent</p>
          <p className="text-sm text-ink-muted">
            We&apos;ll review it and, if approved, send you a payment link to complete your spot.
          </p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-5">
          <p className="text-sm text-ink-muted">
            Tell us who&apos;s coming — we&apos;ll review and send a payment link if approved.
          </p>

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
              className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
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
              className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
            />
            {INSTAGRAM_HANDLE_PATTERN.test(instagram.trim()) && (
              <a
                href={`https://instagram.com/${instagram.trim().replace(/^@/, "")}`}
                target="_blank"
                rel="noreferrer"
                className="self-start font-mono text-[11px] text-accent-bright hover:underline"
              >
                → View @{instagram.trim().replace(/^@/, "")} on Instagram, to double-check
                <span className="sr-only"> (opens in a new tab)</span>
              </a>
            )}
          </label>

          <div className="flex flex-col gap-1.5 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              Phone (for your payment link)
            </span>
            <div className="flex gap-2">
              <select
                value={countryDialCode}
                onChange={(e) => setCountryDialCode(e.target.value)}
                aria-label="Country code"
                className="w-[6.5rem] shrink-0 rounded-xl border border-line bg-bg/60 px-2 py-2.5 text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/40"
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
                className="min-w-0 flex-1 rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
              />
            </div>
          </div>

          <label className="flex flex-col gap-1.5 text-sm">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              Email <span className="normal-case text-ink-faint">(optional)</span>
            </span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
            />
          </label>

          <div className="flex flex-col gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
              Who&apos;s coming
            </span>
            <div className="flex items-center justify-between rounded-2xl border border-line bg-bg/60 px-4 py-3">
              <CountInput label="Guys" value={maleCount} onChange={setMaleCount} />
              <CountInput label="Girls" value={femaleCount} onChange={setFemaleCount} />
              <CountInput label="Other" value={otherCount} onChange={setOtherCount} />
            </div>
          </div>

          <div className="flex items-center justify-between border-t border-line pt-4">
            <span className="font-mono text-xs uppercase tracking-[0.2em] text-ink-faint">
              Total guests
            </span>
            <span className="font-display text-3xl text-ink">{totalGuests}</span>
          </div>

          {error && (
            <p role="alert" className="text-sm text-magenta">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-full bg-accent px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-white shadow-[0_0_30px_-6px_var(--color-accent)] transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {isSubmitting ? "Sending…" : "Send Request"}
          </button>
          <p className="text-center font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
            No payment yet — we review every request first
          </p>
        </form>
      )}
    </div>
  );
}
