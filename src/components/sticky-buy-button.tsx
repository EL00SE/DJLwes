"use client";

import { useEffect, useRef, useState } from "react";
import { BuyTicketsButton } from "@/components/buy-tickets-section";

/** The hero's Buy Tickets button, plus a second copy that appears pinned to
 * the top of the screen once you've scrolled past the first one, and
 * disappears again once you scroll back up to it.
 *
 * This can't be done with plain CSS `position: sticky` — the hero
 * `<section>` has `overflow-hidden` (for the glow/dot-grid background
 * decoration), and a sticky element can never stick past the edge of an
 * overflow-hidden ancestor's own box. Once you scrolled past the end of
 * the (fairly short) hero section, a sticky button would just get clipped
 * away instead of continuing to float over the rest of the page. A
 * `position: fixed` copy, toggled by an IntersectionObserver watching a
 * zero-height sentinel at the button's normal spot, has no such ceiling —
 * `fixed` escapes overflow-hidden ancestors. It would be trapped by any
 * ancestor with a `transform`/`filter`, which is why .page-transition
 * (globals.css) must not keep its transform after its animation ends —
 * tests/mobile.spec.ts covers this. */
export function StickyBuyButton({
  buyLink,
  disclaimer,
  className = "",
}: {
  buyLink: string | null;
  disclaimer: string | null;
  className?: string;
}) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [stuck, setStuck] = useState(false);

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Not just `!isIntersecting` — that's also true before you've
      // scrolled down this far yet (sentinel below the viewport). Only
      // above the viewport (top < 0) means you've scrolled past it.
      setStuck(!entry.isIntersecting && entry.boundingClientRect.top < 0);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div className={className}>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div className="flex flex-col gap-2">
        <BuyTicketsButton
          buyLink={buyLink}
          className={`w-full sm:w-auto sm:self-start ${buyLink ? "buy-pulse" : ""}`}
        />
        {buyLink && (
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
            Secure checkout via Shmor Makom — opens in a new tab
          </p>
        )}
        {disclaimer && <p className="max-w-md text-xs text-ink-faint">{disclaimer}</p>}
      </div>

      {/* lg:hidden — only a long single-column scroll (mobile/tablet)
          benefits from this; at lg: the button already sits beside a
          much taller image and rarely scrolls out of view first. */}
      {stuck && (
        <div className="fixed inset-x-0 top-0 z-20 border-b border-line bg-bg/95 px-5 py-3 shadow-[0_8px_24px_-8px_rgba(0,0,0,0.6)] backdrop-blur-md lg:hidden">
          <BuyTicketsButton buyLink={buyLink} className={buyLink ? "buy-pulse w-full" : "w-full"} />
        </div>
      )}
    </div>
  );
}
