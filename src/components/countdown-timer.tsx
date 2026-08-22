"use client";

import { useEffect, useState } from "react";
import { deferOnce } from "@/lib/defer";

function getRemaining(target: number) {
  const diff = target - Date.now();
  if (diff <= 0) return null;
  return {
    days: Math.floor(diff / 86_400_000),
    hours: Math.floor((diff / 3_600_000) % 24),
    minutes: Math.floor((diff / 60_000) % 60),
    seconds: Math.floor((diff / 1000) % 60),
  };
}

function Unit({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex flex-col items-center">
      <span className="font-display text-3xl tabular-nums text-ink sm:text-4xl">
        {String(value).padStart(2, "0")}
      </span>
      <span className="font-mono text-[10px] uppercase tracking-[0.2em] text-ink-faint">{label}</span>
    </div>
  );
}

/** Live countdown to an event's start. Computed client-side from the
 * buyer's own clock — the target instant (`date`) is already correct UTC
 * regardless of server timezone, so no timezone handling is needed here,
 * just a plain "how far away is this instant" calculation.
 *
 * Deliberately starts as `undefined` (rendering a static placeholder)
 * rather than computing the real value on first render: this component
 * still gets server-rendered, and the server's clock is never exactly
 * the client's clock at hydration time, so eagerly computing "now" in
 * both places would produce a React hydration-mismatch warning. The
 * real numbers only appear once the effect runs, client-side only. */
export function CountdownTimer({ date }: { date: Date }) {
  const target = date.getTime();
  const [remaining, setRemaining] = useState<ReturnType<typeof getRemaining> | undefined>(
    undefined
  );

  useEffect(() => {
    const tick = () => setRemaining(getRemaining(target));
    // The interval alone wouldn't paint real numbers until a second in —
    // a deferred (not synchronous) first tick gets that first paint
    // without the interval's usual 1s delay.
    const cancelFirstTick = deferOnce(tick);
    const interval = setInterval(tick, 1000);
    return () => {
      cancelFirstTick();
      clearInterval(interval);
    };
  }, [target]);

  if (remaining === undefined) {
    return (
      <div className="flex items-start gap-4 sm:gap-6" aria-hidden>
        <Unit value={0} label="Days" />
        <Unit value={0} label="Hrs" />
        <Unit value={0} label="Min" />
        <Unit value={0} label="Sec" />
      </div>
    );
  }

  if (remaining === null) {
    return (
      <p className="font-mono text-xs uppercase tracking-[0.25em] text-accent-bright">
        Doors are open — see you on the floor
      </p>
    );
  }

  return (
    <div className="flex items-start gap-4 sm:gap-6">
      <Unit value={remaining.days} label="Days" />
      <Unit value={remaining.hours} label="Hrs" />
      <Unit value={remaining.minutes} label="Min" />
      <Unit value={remaining.seconds} label="Sec" />
    </div>
  );
}
