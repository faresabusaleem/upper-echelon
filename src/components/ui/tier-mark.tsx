import { tierInfo } from "@/lib/tiers";
import { cn } from "@/lib/utils";

/** The member's rank: a Roman numeral, and optionally its name. */
export function TierMark({
  tier,
  withName = false,
  className,
}: {
  tier: number;
  withName?: boolean;
  className?: string;
}) {
  const t = tierInfo(tier);
  return (
    <span
      className={cn("inline-flex items-baseline gap-1.5 font-display leading-none", className)}
      title={`Tier ${t.numeral} · ${t.name}`}
    >
      <span className={cn("text-gold", tier >= 4 && "text-gold-bright")}>{t.numeral}</span>
      {withName ? <span className="text-ink-2">{t.name}</span> : <span className="sr-only">{t.name}</span>}
    </span>
  );
}

export function StaffMark({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center bg-gold-wash px-2 py-0.5 text-micro text-gold-bright", className)}>
      Staff
    </span>
  );
}
