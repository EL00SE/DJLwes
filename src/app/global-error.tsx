"use client";

import { useEffect } from "react";

// Only fires if the root layout itself throws (very rare — the layout is
// just header/footer chrome) — a normal error.tsx can't catch that,
// since the layout wraps error.tsx too. Has to render its own complete
// <html>/<body> since it replaces the root layout entirely; deliberately
// plain (no fonts/site chrome to depend on) since whatever broke the
// layout might break those too.
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          display: "flex",
          minHeight: "100vh",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "2rem",
          textAlign: "center",
          background: "#08060d",
          color: "#f5f1fb",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        <h1 style={{ fontSize: "1.5rem" }}>Something went wrong</h1>
        <p style={{ color: "#ab9fc7" }}>That&apos;s on us, not you — give it another try.</p>
        <button
          type="button"
          onClick={reset}
          style={{
            borderRadius: "9999px",
            background: "#b13bff",
            color: "#fff",
            padding: "0.625rem 1.5rem",
            border: "none",
            cursor: "pointer",
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
