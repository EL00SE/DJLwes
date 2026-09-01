"use client";

import { useEffect } from "react";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

// Catches any otherwise-unhandled error thrown while rendering a route
// (a DB hiccup, a bug) — without this, Next falls back to its own
// generic, unbranded "Application error" page. Doesn't catch errors in
// the root layout itself — see global-error.tsx for that.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // No error-tracking service wired up yet — this at least lands in
    // Vercel's function logs instead of vanishing entirely.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-5 py-32 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
        {siteConfig.djName}
      </p>
      <h1 className="font-display text-5xl tracking-wide text-ink">Something went wrong</h1>
      <p className="text-ink-muted">
        That&apos;s on us, not you — give it another try, or head back home.
      </p>
      <div className="mt-4 flex flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-accent px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-white transition-opacity hover:opacity-90 active:opacity-80"
        >
          Try Again
        </button>
        <Link
          href="/"
          className="rounded-full border border-accent-dim px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-accent-bright transition-colors hover:bg-accent hover:text-white active:bg-accent active:text-white"
        >
          Back Home
        </Link>
      </div>
    </div>
  );
}
