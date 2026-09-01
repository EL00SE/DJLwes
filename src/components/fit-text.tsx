"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Never shrinks past this, even for a pathologically long title — stays
// readable rather than chasing "one line" all the way down to nothing.
const MIN_SCALE = 0.4;

/** Shrinks its child text down — via a single `transform: scale()`, not a
 * font-size-reducing loop — just enough to fit on one line within its
 * container. Used for event titles, which can be any length or script
 * (including Arabic/Hebrew) and must never wrap mid-title. Renders at
 * natural size until measured client-side, so a title that already fits
 * on one line never changes at all — only long ones get scaled down,
 * and it re-measures on resize via ResizeObserver. */
export function FitText({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const container = containerRef.current;
    const text = textRef.current;
    if (!container || !text) return;

    function fit() {
      // No need to reset any previously-applied scale before measuring —
      // `transform` is a paint-time effect and never changes what
      // `scrollWidth` reports (confirmed: a scaled element reports the
      // same scrollWidth as an unscaled one). An earlier version of this
      // function reset the transform imperatively first, "just in case" —
      // that turned out to be the actual bug: whenever `fit()` ran more
      // than once and landed on the same scale both times (e.g. the
      // ResizeObserver below always fires once immediately on
      // `.observe()`, even with no real resize), React sees the second
      // `setScale` call as a no-op and skips re-rendering, leaving that
      // reset's "scale(1)" sitting in the DOM instead of the real scale —
      // permanently, since nothing ever re-applies it afterward.
      const containerWidth = container!.clientWidth;
      const textWidth = text!.scrollWidth;
      const nextScale = textWidth > containerWidth && textWidth > 0 ? containerWidth / textWidth : 1;
      setScale(Math.max(nextScale, MIN_SCALE));
    }

    fit();

    // Re-measure a few more times over the following ~600ms — the very
    // first `fit()` call above can land before a custom font (next/font
    // swaps in Bebas Neue only once it's ready) has actually applied, so
    // it may measure a fallback font's metrics instead of the real ones.
    // The container itself doesn't resize when the font swaps in, so
    // ResizeObserver alone wouldn't catch this.
    //
    // This intentionally doesn't trust a single "the font is ready now"
    // signal: `document.fonts.ready` resolving only means the font
    // finished loading, not that the browser has necessarily re-laid-out
    // already-rendered text with it yet, and confirmed (under heavy
    // parallel load in tests/mobile.spec.ts) that gap can be wide enough
    // for even a couple of animation frames after `ready` to still land
    // too early. Repeated harmless retries close that gap regardless of
    // its exact size — each call is a cheap, pure re-measurement with no
    // side effect beyond `setScale`, so retrying after it's already
    // correct just re-confirms the same value.
    const retryDelays = [50, 150, 300, 600];
    const timeouts = retryDelays.map((ms) => setTimeout(fit, ms));

    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => {
      timeouts.forEach(clearTimeout);
      observer.disconnect();
    };
  }, [children]);

  return (
    <div ref={containerRef} data-testid="fit-text-container" className="w-full overflow-hidden">
      <div
        ref={textRef}
        data-testid="fit-text-inner"
        className={`inline-block origin-left whitespace-nowrap ${className}`}
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
