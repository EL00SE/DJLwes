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
//      "/#about" link, or a search engine's own address bar), the target
//      can sit inside an unrevealed React Suspense boundary (the
//      Instagram feed, further up the page — see instagram-feed.ts) for
//      a while: still in the DOM, but not yet laid out in its real
//      position, so an early getBoundingClientRect() reads it as "already
//      at the top" when it isn't. That boundary is itself bounded to 5s
//      (FEED_TIMEOUT_MS in instagram-feed.ts) — the later retries here
//      comfortably outlast that, plus a little room for layout to settle
//      once it's revealed, rather than giving up right before it would
//      have succeeded.
const RETRY_DELAYS_MS = [50, 150, 300, 600, 1000, 1500, 2500, 4000, 5500, 7000];

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
