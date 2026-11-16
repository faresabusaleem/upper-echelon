import { MARK } from "./mark-paths";

type Plane = "coronal" | "sagittal" | "transverse";

/**
 * "The Planes": the reduced geometric mark derived from the Upper Echelon engraving.
 * Three perpendicular planes through a head. Drawn in currentColor; one plane may be lit in gold.
 */
export function Mark({
  size = 28,
  className,
  strokeWidth = 3.2,
  lit,
  title = "Upper Echelon",
  decorative = false,
}: {
  size?: number | string;
  className?: string;
  strokeWidth?: number;
  lit?: Plane | null;
  title?: string;
  decorative?: boolean;
}) {
  const planes: Plane[] = ["transverse", "coronal", "sagittal"];
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      fill="none"
      className={className}
      role={decorative ? undefined : "img"}
      aria-hidden={decorative || undefined}
      aria-label={decorative ? undefined : title}
    >
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square">
        {planes.map((p) => (
          <path
            key={`b-${p}`}
            d={MARK.back[p]}
            stroke={lit === p ? "var(--color-gold)" : undefined}
            style={{ transition: "stroke 900ms var(--ease-out-soft)" }}
          />
        ))}
        <path d={MARK.axesBack} opacity={0.45} />
      </g>
      <circle
        cx={MARK.head.cx}
        cy={MARK.head.cy}
        r={MARK.head.r}
        fill="var(--color-ground)"
        stroke="currentColor"
        strokeWidth={strokeWidth}
      />
      <g stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="square">
        {planes.map((p) => (
          <path
            key={`f-${p}`}
            d={MARK.front[p]}
            stroke={lit === p ? "var(--color-gold)" : undefined}
            style={{ transition: "stroke 900ms var(--ease-out-soft)" }}
          />
        ))}
        <path d={MARK.axesFront} />
      </g>
    </svg>
  );
}

export function Wordmark({ className, compact = false }: { className?: string; compact?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-2.5 ${className ?? ""}`}>
      <Mark size={compact ? 26 : 30} decorative className="text-ink" strokeWidth={3.6} />
      <span className="font-display text-[1.35rem] leading-none tracking-[-0.01em] text-ink">Upper Echelon</span>
    </span>
  );
}
