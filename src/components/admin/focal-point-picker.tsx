"use client";

import { useCallback, useRef, useState } from "react";

export type FocalPointPreviewShape = {
  label: string;
  /** A Tailwind aspect-ratio class, e.g. "aspect-[4/5]". */
  aspectClassName: string;
};

const NUDGE_STEP = 4;

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function parsePosition(value: string): [number, number] {
  const match = value.match(/(-?\d+(?:\.\d+)?)%\s+(-?\d+(?:\.\d+)?)%/);
  if (!match) return [50, 50];
  return [clamp(Number(match[1]), 0, 100), clamp(Number(match[2]), 0, 100)];
}

/** Lets the admin choose which part of a photo stays visible, by
 * dragging a marker over it — rather than a fixed-rectangle crop tool,
 * since the same photo can get displayed at several different aspect
 * ratios across the site (a portrait hero on mobile, a wide hero on
 * tablet, square gallery tiles). A focal point re-centers correctly in
 * every one of those shapes; one fixed crop wouldn't. This never
 * modifies or re-uploads the photo — it just sets where CSS
 * `object-position` anchors it, previewed live below via `previewShapes`. */
export function FocalPointPicker({
  src,
  value,
  onChange,
  previewShapes,
}: {
  src: string;
  value: string;
  onChange: (value: string) => void;
  previewShapes: FocalPointPreviewShape[];
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [xPct, yPct] = parsePosition(value);

  const updateFromPoint = useCallback(
    (clientX: number, clientY: number) => {
      const el = containerRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const x = clamp(((clientX - rect.left) / rect.width) * 100, 0, 100);
      const y = clamp(((clientY - rect.top) / rect.height) * 100, 0, 100);
      onChange(`${x.toFixed(1)}% ${y.toFixed(1)}%`);
    },
    [onChange]
  );

  function handlePointerDown(e: React.PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    setIsDragging(true);
    updateFromPoint(e.clientX, e.clientY);
  }

  function handlePointerMove(e: React.PointerEvent<HTMLDivElement>) {
    if (!isDragging) return;
    updateFromPoint(e.clientX, e.clientY);
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    const deltas: Record<string, [number, number]> = {
      ArrowLeft: [-NUDGE_STEP, 0],
      ArrowRight: [NUDGE_STEP, 0],
      ArrowUp: [0, -NUDGE_STEP],
      ArrowDown: [0, NUDGE_STEP],
    };
    const delta = deltas[e.key];
    if (!delta) return;
    e.preventDefault();
    const nextX = clamp(xPct + delta[0], 0, 100);
    const nextY = clamp(yPct + delta[1], 0, 100);
    onChange(`${nextX.toFixed(1)}% ${nextY.toFixed(1)}%`);
  }

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-start">
      <div
        ref={containerRef}
        // No native ARIA role fits a 2D point picker (role="slider"
        // implies a single-dimension range, which this isn't) — a
        // descriptive, position-including label on a plain focusable
        // element is the more honest option than half-implementing a
        // widget pattern this doesn't match.
        tabIndex={0}
        aria-label={`Photo focal point, currently ${xPct.toFixed(0)}% from left and ${yPct.toFixed(0)}% from top. Drag, or focus and use arrow keys, to move it.`}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={() => setIsDragging(false)}
        onPointerCancel={() => setIsDragging(false)}
        onKeyDown={handleKeyDown}
        // touch-action: none stops the browser treating a drag here as a
        // page scroll on mobile, where this is just as likely to be used.
        className="relative aspect-square w-full max-w-[220px] shrink-0 cursor-crosshair touch-none overflow-hidden rounded-xl border border-line-strong outline-none focus-visible:ring-2 focus-visible:ring-accent/60"
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- needs a
            plain <img> for direct pixel measurement on drag; this is an
            admin-only tool, not a page asset next/image needs to optimize. */}
        <img src={src} alt="" className="h-full w-full select-none object-cover" draggable={false} />
        <div
          className="pointer-events-none absolute h-5 w-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-accent shadow-[0_0_0_1px_rgba(0,0,0,0.4)]"
          style={{ left: `${xPct}%`, top: `${yPct}%` }}
        />
      </div>

      <div className="flex flex-1 flex-col gap-2">
        <p className="text-xs text-ink-faint">
          Drag the dot to whatever should stay in frame — a face, the booth, whatever matters most.
          The previews below show how it&apos;ll actually look on the site.
        </p>
        <div className="flex flex-wrap gap-3">
          {previewShapes.map((shape) => (
            <div key={shape.label} className="flex flex-col gap-1">
              <div
                className={`relative w-20 overflow-hidden rounded-lg border border-line ${shape.aspectClassName}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={src}
                  alt=""
                  className="h-full w-full object-cover"
                  style={{ objectPosition: value }}
                />
              </div>
              <span className="font-mono text-[9px] uppercase tracking-wide text-ink-faint">
                {shape.label}
              </span>
            </div>
          ))}
        </div>
        {value !== "50% 50%" && (
          <button
            type="button"
            onClick={() => onChange("50% 50%")}
            className="self-start font-mono text-[10px] uppercase tracking-wide text-ink-faint underline hover:text-ink"
          >
            Reset to center
          </button>
        )}
      </div>
    </div>
  );
}
