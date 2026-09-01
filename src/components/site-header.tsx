"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/lib/site-config";
import { deferOnce } from "@/lib/defer";

const NAV_LINKS = [
  { href: "/", label: "Next Event" },
  { href: "/#about", label: "About" },
  { href: "/past-events", label: "Past Events" },
];

export function SiteHeader({ isAdmin }: { isAdmin: boolean }) {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const topBarRef = useRef<HTMLDivElement>(null);
  const [topBarHeight, setTopBarHeight] = useState(0);

  // The backdrop + dropdown below are portaled to <body> (see the end of
  // this component) rather than left as children of <header> — <header>'s
  // own backdrop-blur-md creates a new containing block for any
  // position:fixed descendant per the CSS Filter Effects spec, which was
  // silently clipping the "full-screen dimming backdrop" down to just the
  // header's own height instead of the whole page. Portaling escapes that
  // without giving up the header's blur. Since the portaled dropdown can
  // no longer rely on normal document flow to sit right below the header,
  // its position is pinned to this measured height instead.
  useLayoutEffect(() => {
    const el = topBarRef.current;
    if (!el) return;
    // Measured synchronously up front rather than waiting on the
    // observer's own first callback (which browsers fire promptly, but
    // not synchronously) — otherwise the dropdown could render at the
    // wrong position for a moment before the observer ever reports back.
    setTopBarHeight(el.offsetHeight);
    const observer = new ResizeObserver(() => setTopBarHeight(el.offsetHeight));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // createPortal needs `document`, which doesn't exist during SSR —
  // rendering the portal only after mount keeps server and first-paint
  // client HTML identical (no hydration mismatch), and costs nothing
  // visible since the menu starts closed either way.
  const [mounted, setMounted] = useState(false);
  useEffect(() => deferOnce(() => setMounted(true)), []);

  return (
    // Sticky only from `lg:` up. Below that, the header scrolls away with
    // the page instead of floating — the buy panel's "center of viewport"
    // scroll (see EventExperience) would otherwise be centering against a
    // viewport height that a persistent header is quietly eating into.
    <header className="top-0 z-40 border-b border-line bg-bg/80 backdrop-blur-md lg:sticky">
      <div
        ref={topBarRef}
        className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8"
      >
        <Link href="/" className="group flex items-center gap-3">
          <span className="relative block h-9 w-9 shrink-0 overflow-hidden rounded-full ring-1 ring-line-strong transition-shadow group-hover:shadow-[0_0_18px_-2px_var(--color-accent)]">
            <Image
              // Decorative — the wordmark right next to it already names
              // the link's destination, so a real alt would just repeat
              // (and mismatch: this logo represents the DJ, not the event
              // series name) what a screen reader already announces.
              src="/images/logo.png"
              alt=""
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
          {/* Same isAdmin check as the mobile menu's version below — see
              that one's comment for why this is safe (server-checked,
              httpOnly cookie). Set apart with a divider, same as there. */}
          {isAdmin && (
            <>
              <div aria-hidden className="mx-1 h-4 w-px bg-line" />
              <Link
                href="/admin"
                className="whitespace-nowrap rounded-full px-4 py-2 text-accent-bright transition-colors hover:text-ink"
              >
                Admin Dashboard
              </Link>
            </>
          )}
        </nav>

        {/* Hamburger toggle below `sm:` */}
        <button
          type="button"
          onClick={() => setIsMenuOpen((open) => !open)}
          aria-label={isMenuOpen ? "Close menu" : "Open menu"}
          aria-expanded={isMenuOpen}
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full text-ink transition-colors hover:text-accent-bright active:text-accent-bright sm:hidden"
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

      {/* Mobile dropdown menu below `sm:` — always in the DOM (rather than
          conditionally mounted) so both opening and closing can animate;
          a plain `{isMenuOpen && ...}` would make it vanish instantly on
          close instead of transitioning out. The backdrop fades over the
          whole page while the panel below grows open in sync, using the
          CSS grid-template-rows trick to animate to/from an unknown
          content height (`0fr` -> `1fr`) without any JS measuring.
          Portaled to <body> — see the comment above topBarRef. */}
      {mounted &&
        createPortal(
          <>
            <button
              type="button"
              aria-label="Close menu"
              tabIndex={isMenuOpen ? 0 : -1}
              onClick={() => setIsMenuOpen(false)}
              className={`fixed inset-0 z-30 bg-bg/60 backdrop-blur-sm transition-opacity duration-300 sm:hidden ${
                isMenuOpen ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            />
            <div
              aria-hidden={!isMenuOpen}
              style={{ top: topBarHeight }}
              className={`fixed inset-x-0 z-40 grid overflow-hidden transition-[grid-template-rows] duration-300 ease-in-out sm:hidden ${
                isMenuOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
              }`}
            >
              <nav className="card-edge relative flex flex-col gap-1 overflow-hidden border-t border-line px-5 py-3 font-mono text-sm uppercase tracking-[0.15em]">
                {NAV_LINKS.map((link) => (
                  <Link
                    key={link.href}
                    href={link.href}
                    tabIndex={isMenuOpen ? 0 : -1}
                    onClick={() => setIsMenuOpen(false)}
                    className="rounded-xl px-4 py-3 text-ink-muted transition-colors hover:bg-bg-raised-2 hover:text-ink active:bg-bg-raised-2 active:text-ink"
                  >
                    {link.label}
                  </Link>
                ))}
                {/* Only ever rendered for a visitor with a valid admin
                    session (checked server-side in layout.tsx — the
                    session cookie is httpOnly, so this can't be spoofed
                    from here) — a quick way back to the dashboard while
                    managing content from a phone, without hunting for
                    the /admin URL. Set apart with its own divider since
                    it's a different kind of link from the public nav
                    above it. */}
                {isAdmin && (
                  <>
                    <div className="my-1 border-t border-line" />
                    <Link
                      href="/admin"
                      tabIndex={isMenuOpen ? 0 : -1}
                      onClick={() => setIsMenuOpen(false)}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-accent-bright transition-colors hover:bg-bg-raised-2 active:bg-bg-raised-2"
                    >
                      Admin Dashboard
                      <span aria-hidden>→</span>
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </>,
          document.body
        )}
    </header>
  );
}
