"use client";

import { useState } from "react";
import { Spinner } from "@/components/spinner";

export function NotifySignupForm() {
  const [email, setEmail] = useState("");
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
        body: JSON.stringify({ email }),
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
