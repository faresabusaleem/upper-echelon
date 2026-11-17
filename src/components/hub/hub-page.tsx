import Link from "next/link";
import { Suspense, type ReactNode } from "react";
import { HubSidebar, SidebarSkeleton } from "./sidebar";
import { cn } from "@/lib/utils";

/** The hub frame: the page on the left, the society's sidebar (who is here, the Circle, stats) on the right. */
export function HubPage({
  children,
  sidebar = true,
  className,
}: {
  children: ReactNode;
  sidebar?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "mx-auto grid w-full max-w-[92rem] gap-6 px-[var(--gutter)] pb-14 pt-5",
        sidebar && "lg:grid-cols-[minmax(0,1fr)_21rem]",
        className,
      )}
    >
      <div className="flex min-w-0 flex-col gap-6">{children}</div>
      {sidebar && (
        <aside aria-label="The society" className="flex min-w-0 flex-col gap-5">
          <Suspense fallback={<SidebarSkeleton />}>
            <HubSidebar />
          </Suspense>
        </aside>
      )}
    </div>
  );
}

export function Crumbs({ items }: { items: Array<{ href?: string; label: string }> }) {
  return (
    <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-1.5 text-small text-muted">
      {items.map((it, i) => (
        <span key={`${it.label}-${i}`} className="inline-flex items-center gap-1.5">
          {i > 0 && <span aria-hidden className="text-faint">›</span>}
          {it.href ? (
            <Link href={it.href} className="hover:text-ink">
              {it.label}
            </Link>
          ) : (
            <span className="text-ink-2" aria-current="page">
              {it.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** A page title row: title and lede on the left, actions on the right. */
export function PageHead({ title, lede, actions }: { title: ReactNode; lede?: ReactNode; actions?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <h1 className="font-display text-[clamp(1.9rem,3.2vw,2.6rem)] leading-[1.05] text-ink">{title}</h1>
        {lede && <p className="mt-2 max-w-[70ch] text-ink-2">{lede}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  );
}
