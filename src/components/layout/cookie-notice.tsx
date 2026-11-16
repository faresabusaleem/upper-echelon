"use client";

import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const KEY = "ue-cookie-notice-v1";
const subscribe = () => () => {};
const readDismissed = () => {
  try {
    return localStorage.getItem(KEY) === "1";
  } catch {
    return true; // storage unavailable: do not nag
  }
};

/**
 * We set only essential cookies (the sign-in session). There is nothing to consent to, so this is
 * a one-time notice rather than a consent banner. Dismissal is remembered in localStorage.
 */
export function CookieNotice() {
  const stored = useSyncExternalStore(subscribe, readDismissed, () => true);
  const [dismissed, setDismissed] = useState(false);
  if (stored || dismissed) return null;
  return (
    <div
      role="region"
      aria-label="Cookie notice"
      className="fixed bottom-4 left-4 right-4 z-[65] flex flex-col gap-3 bg-panel-2 p-4 text-small text-ink-2 shadow-[0_16px_40px_rgba(0,0,0,0.5)] sm:left-auto sm:max-w-md sm:flex-row sm:items-center"
    >
      <p>
        We use only the cookies needed to keep you signed in. No tracking.{" "}
        <Link href="/cookies" className="text-ink underline">
          Details
        </Link>
      </p>
      <button
        type="button"
        className="h-10 shrink-0 bg-ink px-4 font-medium text-ground hover:bg-white"
        onClick={() => {
          try {
            localStorage.setItem(KEY, "1");
          } catch {}
          setDismissed(true);
        }}
      >
        Understood
      </button>
    </div>
  );
}
