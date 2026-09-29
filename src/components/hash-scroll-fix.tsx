"use client";

import { useEffect } from "react";

// TEMPORARY DIAGNOSTIC BUILD — instruments every retry and every scroll
// event into window.__hsfDebug so the real production failure mode can
// be inspected directly instead of guessed at further. Revert once
// diagnosed.
const RETRY_DELAYS_MS = [50, 150, 300, 600, 1000, 1500, 2500, 4000];

declare global {
  interface Window {
    __hsfDebug?: unknown[];
  }
}

export function HashScrollFix() {
  useEffect(() => {
    const hash = window.location.hash;
    if (!hash) return;
    const id = decodeURIComponent(hash.slice(1));

    const t0 = performance.now();
    window.__hsfDebug = [];
    const log = (entry: Record<string, unknown>) =>
      window.__hsfDebug!.push({ t: Math.round(performance.now() - t0), ...entry });

    const scrollListener = () => log({ ev: "scroll-event", scrollY: window.scrollY });
    window.addEventListener("scroll", scrollListener, { passive: true });

    function scrollToTarget(label: string) {
      const el = document.getElementById(id);
      const scrollYBefore = window.scrollY;
      if (!el) {
        log({ ev: "attempt", label, found: false, scrollYBefore });
        return;
      }
      const top = el.getBoundingClientRect().top;
      const alreadyThere = Math.abs(top) < 8;
      const stillNearTop = window.scrollY < 40;
      const willScroll = !alreadyThere && stillNearTop;
      log({ ev: "attempt", label, found: true, top, scrollYBefore, alreadyThere, stillNearTop, willScroll });
      if (willScroll) el.scrollIntoView({ block: "start" });
    }

    scrollToTarget("immediate");
    const timeouts = RETRY_DELAYS_MS.map((ms) => setTimeout(() => scrollToTarget(`retry-${ms}`), ms));
    const finalLog = setTimeout(() => {
      log({ ev: "final", scrollY: window.scrollY });
      console.log("HSF_DEBUG", JSON.stringify(window.__hsfDebug));
    }, 6000);

    return () => {
      timeouts.forEach(clearTimeout);
      clearTimeout(finalLog);
      window.removeEventListener("scroll", scrollListener);
    };
  }, []);

  return null;
}
