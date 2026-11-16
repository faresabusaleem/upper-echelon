"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useOffline } from "next/offline";

/**
 * Small client runtime shared by every page:
 * - marks the document as script-capable (so reveal animations never hide content without JS)
 * - reveals [data-reveal] elements once as they scroll into view
 * - registers the service worker (offline page and static asset cache)
 * - shows a calm banner while offline
 */
export function ClientRuntime() {
  const pathname = usePathname();
  const offline = useOffline();

  useEffect(() => {
    document.documentElement.classList.add("js");
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]:not(.is-revealed)"));
    if (!("IntersectionObserver" in window)) {
      els.forEach((el) => el.classList.add("is-revealed"));
      return;
    }
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) {
            e.target.classList.add("is-revealed");
            io.unobserve(e.target);
          }
        }
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
    );
    els.forEach((el) => io.observe(el));
    return () => io.disconnect();
  }, [pathname]);

  if (!offline) return null;
  return (
    <div role="status" className="fixed inset-x-0 bottom-0 z-[70] bg-panel-2 px-[var(--gutter)] py-3 text-center text-small text-ink">
      You are offline. What you see may be out of date; actions will resume when the connection returns.
    </div>
  );
}
