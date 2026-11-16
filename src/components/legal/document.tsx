import type { ReactNode } from "react";
import { Notice } from "@/components/ui/notice";

/** Long-form page: a title, an optional draft notice, and prose in a readable measure. */
export function Document({
  title,
  lede,
  updated,
  draft = false,
  children,
}: {
  title: string;
  lede?: ReactNode;
  updated?: string;
  draft?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-12 sm:pt-20">
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1fr)_minmax(0,46rem)]">
        <header>
          <h1 className="font-display text-display-l text-ink lg:sticky lg:top-28">{title}</h1>
          {lede && <p className="mt-6 max-w-[40ch] text-lede text-ink-2">{lede}</p>}
          {updated && <p className="mt-6 text-small text-muted">Last updated {updated}</p>}
        </header>
        <div>
          {draft && (
            <Notice tone="warning" title="Draft for review" className="mb-10">
              This document is a draft prepared with the build. It has not been reviewed by a lawyer and must be checked
              and adapted before the site is relied on in public.
            </Notice>
          )}
          <div className="prose-ue">{children}</div>
        </div>
      </div>
    </div>
  );
}
