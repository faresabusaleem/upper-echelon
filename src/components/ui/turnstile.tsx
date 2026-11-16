"use client";

import Script from "next/script";
import { useEffect, useRef } from "react";
import { publicEnv } from "@/lib/env";

declare global {
  interface Window {
    turnstile?: {
      render: (el: HTMLElement, opts: Record<string, unknown>) => string;
      remove: (id: string) => void;
      reset: (id?: string) => void;
    };
  }
}

/**
 * Cloudflare Turnstile, the free privacy-preserving CAPTCHA alternative. Renders into the form and
 * contributes a hidden `cf-turnstile-response` field.
 */
export function Turnstile({ action }: { action: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const idRef = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const render = () => {
      if (cancelled || !ref.current || !window.turnstile || idRef.current) return;
      idRef.current = window.turnstile.render(ref.current, {
        sitekey: publicEnv.NEXT_PUBLIC_TURNSTILE_SITE_KEY,
        action,
        theme: "dark",
        appearance: "always",
        "response-field-name": "cf-turnstile-response",
      });
    };
    const id = setInterval(() => {
      if (window.turnstile) {
        render();
        clearInterval(id);
      }
    }, 150);
    return () => {
      cancelled = true;
      clearInterval(id);
      if (idRef.current && window.turnstile) window.turnstile.remove(idRef.current);
      idRef.current = null;
    };
  }, [action]);

  return (
    <>
      <Script src="https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit" strategy="afterInteractive" />
      <div ref={ref} className="min-h-[65px]" />
    </>
  );
}
