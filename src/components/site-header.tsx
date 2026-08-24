"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";

const NAV_LINKS = [
  { href: "/", label: "Next Event" },
  { href: "/#about", label: "About" },
  { href: "/past-events", label: "Past Events" },
];

export function SiteHeader() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  return (
    // Sticky only from `lg:` up. Below that, the header scrolls away with
    // the page instead of floating — the buy panel's "center of viewport"
    // scroll (see EventExperience) would otherwise be centering against a
    // viewport height that a persistent header is quietly eating into.
    <header className="top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md lg:sticky">
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
          <span className="whitespace-nowrap font-display text-2xl tracking-wide text-ink transition-colors group-hover:text-accent-bright">
            {siteConfig.djName.toUpperCase()}
          </span>
        </Link>

        {/* Full nav from `sm:` up */}
        <nav className="hidden items-center gap-1 font-mono text-xs uppercase tracking-[0.15em] sm:flex">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="whitespace-nowrap rounded-full px-4 py-2 text-ink-muted transition-colors hover:text-ink"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Hamburger toggle below `sm:` */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:text-accent-bright sm:hidden"
        >
          <span className="relative block h-4 w-5">
            <span
              className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                isMenuOpen ? "top-1.5 rotate-45" : "top-0"
              }`}
            />
            <span
              className={`absolute left-0 top-1.5 block h-0.5 w-5 rounded-full bg-current transition-opacity duration-200 ${
                isMenuOpen ? "opacity-0" : "opacity-100"
              }`}
            />
            <span
              className={`absolute left-0 block h-0.5 w-5 rounded-full bg-current transition-transform duration-200 ${
                isMenuOpen ? "top-1.5 -rotate-45" : "top-3"
              }`}
            />
          </span>
        </button>
      </div>

      {/* Mobile dropdown menu below `sm:` */}
      {isMenuOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsMenuOpen(false)}
            className="fixed inset-0 z-30 bg-bg/60 backdrop-blur-sm sm:hidden"
          />
          <nav className="card-edge relative z-40 flex flex-col gap-1 border-t border-line px-5 py-3 font-mono text-sm uppercase tracking-[0.15em] sm:hidden">
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setIsMenuOpen(false)}
                className="rounded-xl px-4 py-3 text-ink-muted transition-colors hover:bg-bg-raised-2 hover:text-ink"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </>
      )}
    </header>
  );
}
