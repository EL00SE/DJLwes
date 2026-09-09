"use client";

import { useState } from "react";
import { HoneypotField } from "@/components/honeypot-field";

export function BookingRequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [message, setMessage] = useState("");
  // Honeypot — a real visitor never sees or fills this in (see the field
  // below), so anything that arrives here non-empty is a bot blindly
  // filling out every input it found. The server checks this, not this
  // component; see src/app/api/booking-requests/route.ts.
  const [company, setCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim() && !phone.trim()) {
      setError("Add an email or phone number so we can reach you.");
      return;
    }
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/booking-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, eventDate, message, company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong. Please try again.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div role="status" className="rounded-2xl border border-line bg-bg-raised px-6 py-8 text-center">
        <p className="font-mono text-xs uppercase tracking-[0.3em] text-mint">Request sent</p>
        <p className="mt-2 text-sm text-ink-muted">
          Thanks — we&apos;ll get back to you shortly to talk details.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-xl flex-col gap-4">
      <HoneypotField id="booking-company" value={company} onChange={setCompany} />

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">Name</span>
        <input
          required
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Your name"
          className="rounded-xl border border-line bg-bg-raised px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Email <span className="normal-case text-ink-faint">(or phone below)</span>
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-xl border border-line bg-bg-raised px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-sm">
          <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
            Phone <span className="normal-case text-ink-faint">(or email above)</span>
          </span>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+972 50 123 4567"
            className="rounded-xl border border-line bg-bg-raised px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
          />
        </label>
      </div>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Event date <span className="normal-case text-ink-faint">(if you know it)</span>
        </span>
        <input
          type="date"
          value={eventDate}
          onChange={(e) => setEventDate(e.target.value)}
          className="rounded-xl border border-line bg-bg-raised px-4 py-2.5 text-ink outline-none transition-colors focus:border-accent focus:ring-2 focus:ring-accent/40"
        />
      </label>

      <label className="flex flex-col gap-1.5 text-sm">
        <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">
          Tell us about it
        </span>
        <textarea
          required
          rows={4}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Event type, venue, headcount, budget — whatever helps us get back to you with a real answer."
          className="resize-y rounded-xl border border-line bg-bg-raised px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
        />
      </label>

      {error && (
        <p role="alert" className="text-sm text-magenta">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={isSubmitting}
        className="self-start rounded-full bg-accent px-6 py-3 font-mono text-sm uppercase tracking-[0.2em] text-white shadow-[0_0_30px_-6px_var(--color-accent)] transition-opacity hover:opacity-90 active:opacity-80 disabled:opacity-50"
      >
        {isSubmitting ? "Sending…" : "Send Request"}
      </button>
    </form>
  );
}
