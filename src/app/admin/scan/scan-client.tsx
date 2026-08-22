"use client";

import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { checkInByReferenceAction, checkInOrderAction, type CheckInResult } from "@/app/admin/checkin-actions";

type Banner = { tone: "green" | "yellow" | "red"; text: string };

function bannerFor(result: CheckInResult): Banner {
  if (!result.ok) {
    if (result.reason === "not_confirmed") {
      return { tone: "red", text: `${result.customerName ?? "Order"} was never confirmed — don't admit.` };
    }
    return { tone: "red", text: "No matching order for that code." };
  }
  if (result.alreadyCheckedIn) {
    return { tone: "yellow", text: `${result.customerName} already checked in — duplicate scan.` };
  }
  return { tone: "green", text: `✓ ${result.customerName} — ${result.ticketSummary}` };
}

const TONE_CLASSES: Record<Banner["tone"], string> = {
  green: "border-mint bg-mint/10 text-mint",
  yellow: "border-accent-bright bg-accent-dim text-accent-bright",
  red: "border-magenta bg-magenta/10 text-magenta",
};

/** Extracts the order id from a decoded QR value — expected to be the
 * full check-in URL (see lib/qr.ts), but falls back to treating the raw
 * decoded text as the id itself in case a QR was generated some other
 * way. */
function orderIdFromScan(decoded: string): string {
  try {
    const url = new URL(decoded);
    return url.pathname.split("/").filter(Boolean).pop() ?? decoded;
  } catch {
    return decoded;
  }
}

export function ScanClient() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [banner, setBanner] = useState<Banner | null>(null);
  const [reference, setReference] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);

  // Guards against re-firing the server action every animation frame while
  // the same QR sits in view, and against a second in-flight lookup
  // starting before the first resolves.
  const lastScannedIdRef = useRef<string | null>(null);
  const isCheckingRef = useRef(false);

  useEffect(() => {
    let stream: MediaStream | null = null;
    let rafId: number;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        tick();
      } catch (err) {
        setCameraError(err instanceof Error ? err.message : "Couldn't access the camera.");
      }
    }

    function tick() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
          const frame = ctx.getImageData(0, 0, canvas.width, canvas.height);
          const code = jsQR(frame.data, frame.width, frame.height);
          if (code && code.data && !isCheckingRef.current) {
            const orderId = orderIdFromScan(code.data);
            if (orderId !== lastScannedIdRef.current) {
              lastScannedIdRef.current = orderId;
              isCheckingRef.current = true;
              checkInOrderAction(orderId)
                .then((result) => setBanner(bannerFor(result)))
                .finally(() => {
                  isCheckingRef.current = false;
                  // Allow the same code to be re-scanned (e.g. a genuine
                  // duplicate-entry attempt) after a short cooldown, so
                  // it doesn't just silently stop reacting to that QR.
                  setTimeout(() => {
                    if (lastScannedIdRef.current === orderId) lastScannedIdRef.current = null;
                  }, 3000);
                });
            }
          }
        }
      }
      rafId = requestAnimationFrame(tick);
    }

    start();
    return () => {
      cancelled = true;
      if (rafId) cancelAnimationFrame(rafId);
      stream?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  async function handleManualLookup(e: React.FormEvent) {
    e.preventDefault();
    if (!reference.trim()) return;
    setIsLookingUp(true);
    try {
      const result = await checkInByReferenceAction(reference.trim());
      setBanner(bannerFor(result));
    } finally {
      setIsLookingUp(false);
    }
  }

  return (
    <div className="mt-6 flex flex-col gap-4">
      <div className="relative overflow-hidden rounded-2xl border border-line bg-black">
        <video ref={videoRef} className="aspect-square w-full object-cover" muted playsInline />
        <canvas ref={canvasRef} className="hidden" />
        {cameraError && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-4 text-center text-sm text-ink-muted">
            {cameraError} — use the manual entry below instead.
          </div>
        )}
      </div>

      {banner && (
        <div className={`rounded-2xl border p-4 text-center text-sm font-medium ${TONE_CLASSES[banner.tone]}`}>
          {banner.text}
        </div>
      )}

      <form onSubmit={handleManualLookup} className="flex gap-2">
        <input
          type="text"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Order code, e.g. A1B2C3D4"
          className="min-w-0 flex-1 rounded-xl border border-line bg-bg/60 px-4 py-2.5 text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent"
        />
        <button
          type="submit"
          disabled={isLookingUp}
          className="shrink-0 rounded-xl bg-accent px-5 py-2.5 font-mono text-xs uppercase tracking-[0.15em] text-white transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          Check In
        </button>
      </form>
    </div>
  );
}
