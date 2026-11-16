import type { ReactNode } from "react";
import { Mark } from "@/components/brand/mark";
import { cn } from "@/lib/utils";

/** A designed empty state: the mark at rest, one sentence, one optional action. */
export function Empty({
  title,
  children,
  action,
  className,
}: {
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col items-start gap-4 bg-raised px-6 py-10 sm:px-10", className)}>
      <Mark size={40} decorative className="text-faint" strokeWidth={3} />
      <p className="font-display text-display-s text-ink">{title}</p>
      {children && <div className="max-w-[52ch] text-muted">{children}</div>}
      {action}
    </div>
  );
}
