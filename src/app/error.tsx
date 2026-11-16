"use client";

import { useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { reportClientError } from "@/lib/report-error";

export default function ErrorPage({ error, retry }: { error: unknown; retry: () => void }) {
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;
  useEffect(() => {
    reportClientError(error, { boundary: "route" });
  }, [error]);
  return (
    <main id="main" className="mx-auto flex w-full max-w-3xl flex-1 flex-col justify-center px-[var(--gutter)] py-24">
      <h1 className="font-display text-display-l text-ink">Something slipped.</h1>
      <p className="mt-6 max-w-[48ch] text-lede text-ink-2">
        An error interrupted this page. It has been recorded. Try again, and if it keeps happening, let us know.
      </p>
      {digest && <p className="figure mt-4 text-micro text-muted">Reference {digest}</p>}
      <div className="mt-10 flex flex-wrap items-center gap-6">
        <Button onClick={() => retry()}>Try again</Button>
        <Link href="/" className="text-ink underline">
          Return to the entrance
        </Link>
      </div>
    </main>
  );
}
