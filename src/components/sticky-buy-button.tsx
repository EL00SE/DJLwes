"use client";

import { useEffect, useRef, useState } from "react";
import { BuyTicketsButton } from "@/components/buy-tickets-section";

// How far from the top of the screen the pinned button rests. The hand-off
// from the real button to the pinned copy happens at exactly this line, so
// the pinned copy takes over at the identical spot, size and shape — it
// reads as the same button sticking, not a second one appearing.
const PIN_TOP_PX = 12;

/** The hero's Buy Tickets button. Once it scrolls up to the top of the
 * screen it stays there, and drops back into place when you scroll back up
 * to where it started. Below `lg:` only — at `lg:` the button already sits
 * beside a much taller photo and rarely scrolls out of view first.
 *
 * This can't be done with plain CSS `position: sticky` — the hero
 * `<section>` has `overflow-hidden` (for the glow/dot-grid background
 * decoration), and a sticky element can never stick past the edge of an
 * overflow-hidden ancestor's own box. Once you scrolled past the end of
 * the (fairly short) hero section, a sticky button would just get clipped
 * away instead of continuing to float over the rest of the page. So there
 * are two identical buttons: the real one in the page, and a
 * `position: fixed` twin that has no such ceiling — `fixed` escapes
 * overflow-hidden ancestors. It would be trapped by any ancestor with a
 * `transform`/`filter`, which is why .page-transition (globals.css) must
 * not keep its transform after its animation ends — tests/mobile.spec.ts
 * covers this.
 *
 * The twin is always rendered and only toggled with `visibility` (rather
 * than mounted on demand) so it exists, styled identically, and with its
 * glow animation in step with the real one's, before it's ever needed.
 * While one is showing the other is `visibility: hidden`, which also takes
 * it out of the tab order and away from screen readers — only ever one
 * live "Buy Tickets" link. */
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
    const observer = new IntersectionObserver(
      ([entry]) => {
        // Not just `!isIntersecting` — that's also true before you've
        // scrolled down this far yet (sentinel below the viewport). Only
        // above the pin line means you've scrolled up to or past it.
        setStuck(!entry.isIntersecting && entry.boundingClientRect.top < PIN_TOP_PX);
      },
      // Shrinks the observed area's top edge down to the pin line, so
      // "left the screen" really means "reached the pin line".
      { rootMargin: `-${PIN_TOP_PX}px 0px 0px 0px` }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const buttonClassName = `w-full sm:w-auto sm:self-start ${buyLink ? "buy-pulse" : ""}`;

  return (
    <div className={className}>
      <div ref={sentinelRef} aria-hidden className="h-px" />
      <div className="flex flex-col gap-2">
        {/* max-lg: because `stuck` also flips on desktop, where nothing is
            pinned and this button has to stay put. */}
        <div data-testid="buy-original" className="flex flex-col">
          <BuyTicketsButton
            buyLink={buyLink}
            className={`${buttonClassName} ${stuck ? "max-lg:invisible" : ""}`}
          />
        </div>
        {buyLink && (
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
            Secure checkout via Shmor Makom — opens in a new tab
          </p>
        )}
        {disclaimer && <p className="max-w-md text-xs text-ink-faint">{disclaimer}</p>}
      </div>

      {/* The strip itself ignores taps so it doesn't block the page
          beside/behind the button; only the button takes them. Same
          container, gutter and button classes as the real one so the two
          line up pixel for pixel. */}
      <div
        data-testid="buy-pinned"
        style={{ top: PIN_TOP_PX }}
        className={`pointer-events-none fixed inset-x-0 z-20 lg:hidden ${
          stuck ? "visible" : "invisible"
        }`}
      >
        <div className="mx-auto flex max-w-6xl flex-col px-5 sm:px-8">
          <BuyTicketsButton
            buyLink={buyLink}
            className={`pointer-events-auto ${buttonClassName}`}
          />
        </div>
      </div>
    </div>
  );
}
