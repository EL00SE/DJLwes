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
      // Reset to natural size before measuring — otherwise a previous
      // scale would throw off scrollWidth, shrinking a little more every
      // time this re-runs instead of settling on the right value.
      text!.style.transform = "scale(1)";
      const containerWidth = container!.clientWidth;
      const textWidth = text!.scrollWidth;
      const nextScale = textWidth > containerWidth && textWidth > 0 ? containerWidth / textWidth : 1;
      setScale(Math.max(nextScale, MIN_SCALE));
    }

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(container);
    return () => observer.disconnect();
  }, [children]);

  return (
    <div ref={containerRef} className="w-full overflow-hidden">
      <div
        ref={textRef}
        className={`inline-block origin-left whitespace-nowrap ${className}`}
        style={{ transform: `scale(${scale})` }}
      >
        {children}
      </div>
    </div>
  );
}
