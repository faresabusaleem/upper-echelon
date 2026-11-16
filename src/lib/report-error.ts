/** Sends a client-side error to /api/log (stored in error_logs, visible to administrators). */
export function reportClientError(error: unknown, context: Record<string, unknown> = {}) {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const body = JSON.stringify({
      message: e.message.slice(0, 1000),
      stack: e.stack?.slice(0, 4000),
      digest: (e as Error & { digest?: string }).digest,
      url: typeof window !== "undefined" ? window.location.pathname : undefined,
      context,
    });
    if (typeof navigator !== "undefined" && "sendBeacon" in navigator) {
      navigator.sendBeacon("/api/log", new Blob([body], { type: "application/json" }));
    } else {
      void fetch("/api/log", { method: "POST", body, headers: { "content-type": "application/json" }, keepalive: true });
    }
  } catch {
    // Never let error reporting throw.
  }
}
