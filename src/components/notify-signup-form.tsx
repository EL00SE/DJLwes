"use client";

import { useState } from "react";
import { Spinner } from "@/components/spinner";

export function NotifySignupForm() {
  const [email, setEmail] = useState("");
  // Honeypot — a real visitor never sees or fills this in (see the field
  // below), so anything that arrives here non-empty is a bot blindly
  // filling out every input it found. The server checks this, not this
  // component; see src/app/api/notify-signup/route.ts.
  const [company, setCompany] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    try {
      const res = await fetch("/api/notify-signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, company }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong.");
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <p role="status" className="font-mono text-xs uppercase tracking-[0.25em] text-mint">
        You&apos;re on the list — we&apos;ll email you the moment it&apos;s announced.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full max-w-sm flex-col gap-2 sm:flex-row">
      {/* Honeypot field: positioned off-screen (not display:none, which
          some bots specifically know to skip) and hidden from assistive
          tech and tab order, so it's invisible to every real visitor —
          sighted, screen-reader, or keyboard — but still present for a
          bot that fills in every field it finds. */}
      <div className="absolute left-[-9999px]" aria-hidden="true">
        <label htmlFor="notify-company">Company</label>
        <input
          id="notify-company"
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
        />
      </div>

      <label htmlFor="notify-email" className="sr-only">
        Email address
      </label>
      <input
        id="notify-email"
        required
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        className="min-w-0 flex-1 rounded-full border border-line bg-bg-raised px-4 py-2.5 text-sm text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent focus:ring-2 focus:ring-accent/40"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="flex shrink-0 items-center justify-center gap-1.5 rounded-full bg-accent px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isSubmitting ? <Spinner size={13} /> : "Notify me"}
      </button>
      {error && (
        <p role="alert" className="text-sm text-magenta sm:basis-full">
          {error}
        </p>
      )}
    </form>
  );
}
