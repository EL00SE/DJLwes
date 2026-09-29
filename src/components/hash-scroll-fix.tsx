"use client";

import { useEffect } from "react";

// Same "re-assert a few times over a few seconds, rather than trust one
// attempt" idea as fit-text.tsx's retryDelays. Two reasons a single
// attempt isn't enough, both confirmed by direct reproduction:
//   1. The target section hasn't streamed into the DOM yet (a slow
//      connection, a cold serverless start, real Neon/Postgres latency)
//      — document.getElementById() simply returns null until then.
//   2. A pasted Instagram post (instagram-posts.tsx) renders as a plain
//      link first and only becomes the full-sized embed once Instagram's
//      own embed.js loads and resizes it — which can easily take longer
//      than the early retries, shifting everything below it (including
//      whatever this is scrolling to) further down the page after the
//      first successful scroll already landed.
const RETRY_DELAYS_MS = [50, 150, 300, 600, 1000, 1500, 2500, 4000, 6000];

/** Next's own scroll-to-hash-on-navigation loses the race on this app's
 * dynamically-rendered pages — the target section may not have streamed
 * into the DOM yet by the time it tries, and it never retries. Only
 * affects navigating to a hash link *from a different page/load*; a
 * same-page hash click already works, since the target is already there.
 *
 * Rendered inside template.tsx (which remounts on every navigation,
 * unlike layout.tsx) so this re-runs on every route change, not just the
 * very first page load. */
export function HashScrollFix() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));

    // Keeps re-asserting the scroll until a real person actually touches
    // the page — not until scrollY drifts from 0, which a later layout
    // shift (see reason 2 above) can do on its own, with nobody at the
    // wheel. Once a visitor does scroll/swipe/press a key themselves,
    // every retry below becomes a no-op for the rest of this mount.
    let userInteracted = false;
    const markInteracted = () => {
      userInteracted = true;
    };
    const interactionEvents = ["wheel", "touchstart", "keydown"] as const;
    interactionEvents.forEach((ev) => window.addEventListener(ev, markInteracted, { passive: true }));

    function scrollToTarget() {
      if (userInteracted) return;
      const el = document.getElementById(id);
      if (!el) return; // hasn't streamed in yet — a later retry will catch it
      // "Already there" means "at its actual resting position" — which
      // isn't the viewport's literal top edge. The target sections use
      // scroll-margin-top (Tailwind's scroll-mt-*) for breathing room
      // above the heading, and scrollIntoView({block:"start"}) honors
      // that automatically, so this check needs to too.
      const restingTop = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
      if (Math.abs(el.getBoundingClientRect().top - restingTop) >= 8) el.scrollIntoView({ block: "start" });
    }

    scrollToTarget();
    const timeouts = RETRY_DELAYS_MS.map((ms) => setTimeout(scrollToTarget, ms));
    return () => {
      timeouts.forEach(clearTimeout);
      interactionEvents.forEach((ev) => window.removeEventListener(ev, markInteracted));
    };
  }, []);

  return null;
}
