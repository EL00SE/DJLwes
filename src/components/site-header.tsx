import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-line-strong transition-shadow group-hover:shadow-[0_0_18px_-2px_var(--color-accent)]">
            <Image
              src="/images/logo.png"
              alt={siteConfig.eventSeriesName}
              width={72}
              height={72}
              priority
              className="h-full w-full object-cover"
            />
          </span>
          <span className="font-display text-2xl tracking-wide text-ink transition-colors group-hover:text-accent-bright">
            {siteConfig.djName.toUpperCase()}
          </span>
        </Link>

        <nav className="flex items-center gap-1 font-mono text-xs uppercase tracking-[0.15em]">
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-ink-muted transition-colors hover:text-ink"
          >
            Next Event
          </Link>
          <Link
            href="/past-events"
            className="rounded-full px-4 py-2 text-ink-muted transition-colors hover:text-ink"
          >
            Past Events
          </Link>
        </nav>
      </div>
    </header>
  );
}
