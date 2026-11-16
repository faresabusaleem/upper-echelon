"use client";

import { forwardRef, type ReactNode } from "react";
import { GAMES, type GameKind } from "@/lib/games/catalog";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** The playing field: a dark plate that fills the width, tall on desktop, thumb-sized on phones. */
export const Stage = forwardRef<
  HTMLDivElement,
  { children: ReactNode; className?: string; tone?: "plate" | "gold" | "alarm" | "deep" } & React.HTMLAttributes<HTMLDivElement>
>(function Stage({ children, className, tone = "plate", ...props }, ref) {
  const tones = {
    plate: "bg-raised text-ink",
    deep: "bg-sunk text-ink",
    gold: "bg-gold text-ground",
    alarm: "bg-danger-wash text-ink",
  } as const;
  return (
    <div
      ref={ref}
      className={cn(
        "relative flex min-h-[min(68svh,40rem)] w-full touch-manipulation select-none flex-col items-center justify-center overflow-hidden px-6 py-10 transition-colors duration-[120ms]",
        tones[tone],
        className,
      )}
      {...props}
    >
      {children}
    </div>
  );
});

export function GameIntro({
  kind,
  onStart,
  note,
}: {
  kind: GameKind;
  onStart: () => void;
  note?: ReactNode;
}) {
  const g = GAMES[kind];
  return (
    <div className="flex w-full max-w-xl flex-col items-start gap-6 text-left">
      <p className="font-display text-display-m leading-tight text-ink">{g.line}</p>
      <ol className="flex list-decimal flex-col gap-2 pl-5 text-ink-2 marker:text-muted">
        {g.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
      {note}
      <Button onClick={onStart} size="lg" autoFocus>
        Begin the trial
      </Button>
    </div>
  );
}

/** Small persistent readouts during play: level, lives, counts. */
export function Readout({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return (
    <dl className="absolute left-5 right-5 top-4 flex flex-wrap gap-x-8 gap-y-1 text-small">
      {items.map((i) => (
        <div key={i.label} className="flex items-baseline gap-2">
          <dt className="text-muted">{i.label}</dt>
          <dd className="figure text-ink">{i.value}</dd>
        </div>
      ))}
    </dl>
  );
}

export function Lives({ left, total }: { left: number; total: number }) {
  return (
    <span className="inline-flex gap-1.5" aria-label={`${left} of ${total} lives left`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} aria-hidden className={cn("inline-block size-2.5", i < left ? "bg-gold" : "bg-panel-3")} />
      ))}
    </span>
  );
}
