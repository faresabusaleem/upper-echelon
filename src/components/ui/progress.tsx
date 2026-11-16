import { cn } from "@/lib/utils";

export function Progress({ value, max = 100, className, label }: { value: number; max?: number; className?: string; label: string }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-valuenow={Math.round(value)}
      className={cn("h-1.5 w-full bg-panel-3", className)}
    >
      <div className="h-full bg-gold transition-[width] duration-[900ms] ease-[var(--ease-out-soft)]" style={{ width: `${pct}%` }} />
    </div>
  );
}
