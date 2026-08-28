import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

// Shown for any unmatched route (a typo'd URL, an old bookmarked link to
// an event that's since been deleted, etc.) — without this, Next falls
// back to its own generic, unbranded 404 page.
export default function NotFound() {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-center gap-4 px-5 py-32 text-center">
      <p className="font-mono text-xs uppercase tracking-[0.3em] text-accent-bright">
        {siteConfig.djName}
      </p>
      <h1 className="font-display text-6xl tracking-wide text-ink">404</h1>
      <p className="text-ink-muted">
        That page doesn&apos;t exist — it may have moved, or the link was never right to begin with.
      </p>
      <Link
        href="/"
        className="mt-4 rounded-full border border-accent-dim px-6 py-2.5 font-mono text-xs uppercase tracking-[0.2em] text-accent-bright transition-colors hover:bg-accent hover:text-white"
      >
        Back Home
      </Link>
    </div>
  );
}
