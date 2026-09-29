"use client";

import { useEffect } from "react";

// Same "re-assert a few times over a few seconds, rather than trust one
// attempt" idea as fit-text.tsx's retryDelays — needed here for two
// distinct, both confirmed-by-reproduction problems:
//   1. The target section hasn't streamed into the DOM yet (a slow
//      connection, a cold serverless start) — the early attempts are for
//      this; document.getElementById() simply returns null until then.
//   2. On a genuine top-level navigation to a hash URL that follows an
//      *earlier* navigation in the same tab/session (e.g. someone
//      already has the site open on another page and follows a shared
//      "/#about" link, or a search engine's own address bar), whatever
//      already-scrolled-to position this reaches gets silently reset
//      back to the very top shortly after — reproduced reliably even
//      though the target element is already in the DOM and scrollable
//      the whole time. The later attempts re-correct that.
const RETRY_DELAYS_MS = [50, 150, 300, 600, 1000, 1500, 2500, 4000];

/** Next's own scroll-to-hash-on-navigation loses the race on this app's
 * dynamically-rendered pages (see problem 1 above) — and, separately,
 * doesn't survive a later scroll reset from elsewhere (problem 2). Both
 * only affect navigating to a hash link *from a different page/load*; a
 * same-page hash click already works, since the target is already there
 * and nothing scrolls it back afterward.
 *
 * Rendered inside template.tsx (which remounts on every navigation,
 * unlike layout.tsx) so this re-runs on every route change, not just the
 * very first page load. */
export function HashScrollFix() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));

    function scrollToTarget() {
      const el = document.getElementById(id);
      if (!el) return; // hasn't streamed in yet — a later retry will catch it
      const alreadyThere = Math.abs(el.getBoundingClientRect().top) < 8;
      // Only re-correct while still near the very top of the page —
      // that's the specific symptom problem 2 above describes, not a
      // general "keep this element in view no matter what" policy. A
      // visitor who's since scrolled elsewhere on purpose (scrollY well
      // past 0) is left alone rather than yanked back.
      const stillNearTop = window.scrollY < 40;
      if (!alreadyThere && stillNearTop) el.scrollIntoView({ block: "start" });
    }

    scrollToTarget();
    const timeouts = RETRY_DELAYS_MS.map((ms) => setTimeout(scrollToTarget, ms));
    return () => timeouts.forEach(clearTimeout);
  }, []);

  return null;
}
