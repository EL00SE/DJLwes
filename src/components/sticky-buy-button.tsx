"use client";

import { useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { BuyTicketsButton } from "@/components/buy-tickets-section";

/** The hero's Buy Tickets button. Below `lg:` it scrolls with the page like
 * any other element, then sticks to the top of the screen and stays there
 * for the rest of the page — until you scroll back up to where it started.
 *
 * That's the browser's own `position: sticky`, so it moves with the scroll
 * itself: no scroll listener or observer in the path, nothing that can lag
 * a frame behind a flick and make the button visibly jump or "snap" into
 * place (an earlier version swapped in a fixed-position copy from an
 * IntersectionObserver callback, which did exactly that).
 *
 * Sticky can't live in the hero itself: the hero `<section>` clips its
 * background decoration, and a sticky element is also only ever stuck
 * within its parent — the hero is short, so it'd let go right after the
 * hero ended instead of following you down the page. So the sticky button
 * lives in a lane spanning the whole page (portaled into the empty
 * #buy-rail-host at the top of the homepage's relative-positioned
 * wrapper, see app/page.tsx), whose top edge is positioned to start
 * exactly where the real button sits here. The real button stays in the
 * hero as an invisible placeholder so the layout doesn't change, and at
 * `lg:` — where nothing sticks — it's simply the visible one.
 *
 * Until the lane is measured and in place (or without JS), the real
 * button just shows normally. Both swap in the same React commit, so
 * there's no frame with neither or both. While one is visible the other
 * is `visibility: hidden`, which also keeps it out of the tab order and
 * away from screen readers — only ever one live "Buy Tickets" link. */
export function StickyBuyButton({
  buyLink,
  disclaimer,
  className = "",
}: {
  buyLink: string | null;
  disclaimer: string | null;
  className?: string;
}) {
  const slotRef = useRef<HTMLDivElement>(null);
  const [rail, setRail] = useState<{ host: HTMLElement; top: number } | null>(null);

  // Where the lane starts: the real button's top edge, measured relative to
  // the page wrapper (a difference of two viewport positions, so it doesn't
  // depend on scroll). Re-measured whenever anything that could move it
  // resizes — the photo loading, the title refitting, fonts swapping in.
  useLayoutEffect(() => {
    const slot = slotRef.current;
    const host = document.getElementById("buy-rail-host");
    const wrapper = host?.parentElement;
    if (!slot || !host || !wrapper) return;

    let cancelled = false;
    const measure = () => {
      if (cancelled) return;
      const top = Math.round((slot.getBoundingClientRect().top - wrapper.getBoundingClientRect().top) * 100) / 100;
      setRail((prev) => (prev && prev.top === top ? prev : { host, top }));
    };
    measure();

    const observer = new ResizeObserver(measure);
    observer.observe(wrapper);
    observer.observe(slot);
    window.addEventListener("resize", measure);
    document.fonts?.ready.then(measure);
    return () => {
      cancelled = true;
      observer.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, []);

  const buttonClassName = `w-full sm:w-auto sm:self-start ${buyLink ? "buy-pulse" : ""}`;

  return (
    <div className={className}>
      <div className="flex flex-col gap-2">
        {/* max-lg: because at lg and up nothing sticks, so this stays
            the visible one. */}
        <div
          ref={slotRef}
          data-testid="buy-original"
          className={`flex flex-col ${rail ? "max-lg:invisible" : ""}`}
        >
          <BuyTicketsButton buyLink={buyLink} className={buttonClassName} />
        </div>
        {buyLink && (
          <p className="font-mono text-[10px] uppercase tracking-[0.15em] text-ink-faint">
            Secure checkout via Shmor Makom — opens in a new tab
          </p>
        )}
        {disclaimer && <p className="max-w-md text-xs text-ink-faint">{disclaimer}</p>}
      </div>

      {rail &&
        createPortal(
          // The lane: starts where the real button does, runs to the bottom
          // of the page content (so the button lets go there, above the
          // footer, the way sticky normally ends). It ignores taps itself so
          // it never blocks the page; only the button takes them. Same
          // container, gutter and classes as the real button so the two
          // line up exactly. top-3 = 12px, the resting distance from the top.
          <div
            data-testid="buy-pinned"
            style={{ top: rail.top }}
            className="pointer-events-none absolute inset-x-0 bottom-0 z-20 lg:hidden"
          >
            <div className="sticky top-3">
              <div className="mx-auto flex max-w-6xl flex-col px-5 sm:px-8">
                <BuyTicketsButton
                  buyLink={buyLink}
                  className={`pointer-events-auto ${buttonClassName}`}
                />
              </div>
            </div>
          </div>,
          rail.host
        )}
    </div>
  );
}
