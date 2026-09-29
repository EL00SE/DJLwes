"use client";

import { useEffect } from "react";

// Same "re-assert a few times over a few seconds, rather than trust one
// attempt" idea as fit-text.tsx's retryDelays. Mainly for the target
// section not having streamed into the DOM yet (a slow connection, a
// cold serverless start, real Neon/Postgres latency) — document.
// getElementById() simply returns null until then, and the early
// attempts are what catch it once it does. The tail is left generously
// long (this used to matter even more before an actual page-freezing
// bug — a Next.js loading.tsx implicit Suspense boundary whose reveal
// script could silently never fire — was found and fixed at the root;
// see the "Removed loading.tsx" note in git history if this behavior
// ever resurfaces) since a few harmless extra no-op checks cost nothing.
const RETRY_DELAYS_MS = [50, 150, 300, 600, 1000, 1500, 2500, 4000];

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
