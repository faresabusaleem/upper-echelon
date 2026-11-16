"use client";

import { useEffect } from "react";
import { reportClientError } from "@/lib/report-error";

/** Last-resort boundary for failures in the root layout. Inline styles: global CSS may not load. */
export default function GlobalError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    reportClientError(error, { boundary: "global" });
  }, [error]);
  return (
    <html lang="en-GB">
      <body style={{ margin: 0, background: "#0b0b0a", color: "#edeae3", fontFamily: "Georgia, serif" }}>
        <main style={{ maxWidth: 640, margin: "0 auto", padding: "20vh 24px" }}>
          <h1 style={{ fontSize: 44, fontWeight: 400, margin: 0 }}>The house is briefly closed.</h1>
          <p style={{ fontFamily: "Helvetica, Arial, sans-serif", fontSize: 18, lineHeight: 1.6, color: "#cfcac0" }}>
            Something failed before the page could load. It has been recorded.
          </p>
          <button
            onClick={() => retry()}
            style={{ marginTop: 24, height: 48, padding: "0 24px", border: 0, background: "#c2a15f", color: "#0b0b0a", fontSize: 16, cursor: "pointer" }}
          >
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
