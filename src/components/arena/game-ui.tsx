"use client";

import { forwardRef, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { GAMES, type GameKind } from "@/lib/games/catalog";
import { GAME_THEMES } from "@/lib/games/themes";
import { setSound, soundOn, subscribeSound } from "@/lib/games/sound";
import { Flame, Sigil } from "@/components/ui/sigils";
import { cn } from "@/lib/utils";

type Tone = "plate" | "deep" | "go" | "alarm";

/**
 * The playing field: a large rounded stage in the trial's own colour. `tone` lets a trial switch the
 * whole field (Reaction Time turns it to its signal colour, or to ember for a false start).
 */
export const Stage = forwardRef<
  HTMLDivElement,
  { kind: GameKind; children: ReactNode; className?: string; tone?: Tone } & React.HTMLAttributes<HTMLDivElement>
>(function Stage({ kind, children, className, tone = "plate", style, ...props }, ref) {
  const t = GAME_THEMES[kind];
  const backgrounds: Record<Tone, string> = {
    plate: `radial-gradient(90% 70% at 50% 0%, ${t.tint}2e 0%, transparent 60%), radial-gradient(70% 60% at 50% 110%, ${t.tint}1f 0%, transparent 60%), ${t.stage}`,
    deep: `radial-gradient(80% 60% at 50% 0%, ${t.tint}1a 0%, transparent 60%), ${t.stage}`,
    go: `radial-gradient(70% 70% at 50% 50%, #ffffff33 0%, transparent 70%), ${t.tint}`,
    alarm: "radial-gradient(70% 70% at 50% 50%, #ff8a6b22 0%, transparent 70%), #3a1712",
  };
  return (
    <div
      ref={ref}
      className={cn(
        "relative isolate flex min-h-[min(70svh,38rem)] w-full touch-manipulation select-none flex-col items-center justify-center overflow-hidden rounded-[28px] border border-white/[0.07] px-5 pb-10 pt-20 text-white shadow-[0_30px_80px_-30px_rgba(0,0,0,0.8)] transition-[background] duration-150 sm:px-10",
        tone === "go" && "text-[#141414]",
        className,
      )}
      style={{ background: backgrounds[tone], ["--tint" as string]: t.tint, ["--glow" as string]: t.glow, ["--stage" as string]: t.stage, ...style }}
      {...props}
    >
      <span aria-hidden className="pointer-events-none absolute -bottom-16 -right-12 -z-10 opacity-[0.06]" style={{ color: t.tint }}>
        <Sigil name={t.sigil} size={300} strokeWidth={1} />
      </span>
      {children}
    </div>
  );
});

/** Rounded tiles: idle, lit (glowing in the trial's colour), wrong (ember), or done. */
export function tileClass(state: "idle" | "lit" | "wrong" | "done" | "off") {
  return cn(
    "rounded-[14px] transition-[transform,background-color,box-shadow,opacity] duration-150 ease-out outline-offset-2 disabled:cursor-default",
    state === "idle" && "bg-white/[0.09] hover:bg-white/[0.15] active:scale-[0.94]",
    state === "lit" && "scale-[1.03] bg-[var(--tint)] shadow-[0_0_30px_var(--glow)]",
    state === "done" && "bg-[var(--tint)] opacity-60",
    state === "wrong" && "bg-[#c8573f] shadow-[0_0_24px_rgba(200,87,63,0.5)]",
    state === "off" && "bg-white/[0.04]",
  );
}

/** The trial's opening card. Space or Enter begins, so the next attempt is always one key away. */
export function GameIntro({
  kind,
  onStart,
  note,
  autoFocus = false,
  action = "Begin the trial",
}: {
  kind: GameKind;
  onStart: () => void;
  note?: ReactNode;
  autoFocus?: boolean;
  action?: string;
}) {
  const g = GAMES[kind];
  const t = GAME_THEMES[kind];
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName))) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onStart();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onStart]);
  return (
    <div className="flex w-full max-w-xl flex-col items-center gap-5 text-center">
      <span
        className="inline-flex size-20 items-center justify-center rounded-[22px] motion-safe:animate-[float_4s_ease-in-out_infinite]"
        style={{ background: `${t.tint}24`, color: t.tint, boxShadow: `0 0 50px ${t.glow}` }}
      >
        <Sigil name={t.sigil} size={40} />
      </span>
      <div>
        <h2 className="font-display text-[clamp(2.2rem,5vw,3.4rem)] leading-none">{g.name}</h2>
        <p className="mt-3 text-[1.05rem] text-white/75">{g.line}</p>
      </div>
      <ol className="flex flex-col gap-1.5 text-small text-white/65">
        {g.rules.map((r) => (
          <li key={r}>{r}</li>
        ))}
      </ol>
      {note}
      <button
        type="button"
        onClick={onStart}
        autoFocus={autoFocus}
        className="mt-1 inline-flex h-14 items-center justify-center rounded-2xl px-10 text-[1.05rem] font-semibold transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:translate-y-0 active:scale-[0.97]"
        style={{ background: t.tint, color: t.stage, boxShadow: `0 12px 30px -10px ${t.glow}` }}
      >
        {action}
      </button>
      <p className="text-micro text-white/40">or press Space</p>
    </div>
  );
}

/** Lives as candle flames: they gutter out one by one. */
export function Lives({ left, total }: { left: number; total: number }) {
  return (
    <span className="inline-flex items-end gap-0.5" role="img" aria-label={`${left} of ${total} lives left`}>
      {Array.from({ length: total }).map((_, i) => (
        <span key={`${i}-${i < left}`} className={cn(i < left ? "motion-safe:animate-[flicker_1.8s_ease-in-out_infinite]" : "animate-[snuff_.5s_ease-out_both]")} style={{ animationDelay: `${i * 0.23}s` }}>
          <Flame lit={i < left} size={27} />
        </span>
      ))}
    </span>
  );
}

function SoundToggle() {
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true);
  return (
    <button
      type="button"
      onClick={() => setSound(!on)}
      onPointerDown={(e) => e.stopPropagation()}
      className="inline-flex size-9 items-center justify-center rounded-full bg-black/25 text-white/80 backdrop-blur hover:bg-black/40 hover:text-white"
      aria-label={on ? "Mute sounds" : "Turn sounds on"}
      aria-pressed={!on}
    >
      <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
        <path d="M4 9.5h3.5L12 5.5v13L7.5 14.5H4Z" />
        {on ? <path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11" /> : <path d="m16 9.5 5 5m0-5-5 5" />}
      </svg>
    </button>
  );
}

/**
 * The heads-up display along the top of the stage: the rite (level), any other counters, the
 * remaining lives, and the sound switch.
 */
export function Hud({
  level,
  levelLabel = "Level",
  lives,
  items = [],
}: {
  level?: number | null;
  levelLabel?: string;
  lives?: { left: number; total: number };
  items?: Array<{ label: string; value: ReactNode }>;
}) {
  return (
    <div className="absolute inset-x-4 top-4 z-10 flex items-start justify-between gap-3 sm:inset-x-6 sm:top-5">
      <dl className="flex items-start gap-5">
        {level != null && (
          <div className="flex flex-col">
            <dt className="text-[0.66rem] uppercase tracking-[0.2em] opacity-60">{levelLabel}</dt>
            <dd key={level} className="figure text-[1.9rem] leading-none motion-safe:animate-[pop_.45s_cubic-bezier(.2,.9,.3,1.4)]">
              {level}
            </dd>
          </div>
        )}
        {items.map((i) => (
          <div key={i.label} className="flex flex-col">
            <dt className="text-[0.66rem] uppercase tracking-[0.2em] opacity-60">{i.label}</dt>
            <dd className="figure text-[1.3rem] leading-tight">{i.value}</dd>
          </div>
        ))}
      </dl>
      <div className="flex items-center gap-2">
        {lives && <Lives left={lives.left} total={lives.total} />}
        <SoundToggle />
      </div>
    </div>
  );
}

/** Kept for trials that only need simple counters: the same display, without lives. */
export function Readout({ items }: { items: Array<{ label: string; value: ReactNode }> }) {
  return <Hud items={items} />;
}

/** The short line above the playing area ("Remember.", "Your turn."), in the same place in every trial. */
export function Prompt({ children }: { children?: ReactNode }) {
  return (
    <p className="mb-4 mt-2 h-5 text-center text-small text-white/55" aria-live="polite">
      {children}
    </p>
  );
}

export type TileBack = "lit" | "wrong" | "missed" | "hidden";

/**
 * A tile with two faces that turns over in 3D. The front is what a tile shows at rest (plain, or a
 * number in the Chimp Test); the back is the trial's colour when lit, ember for a mistake, an
 * outline for a tile that was missed, or a plain block when hiding a number.
 */
export function FlipTile({
  up,
  back = "lit",
  front,
  frontClassName,
  label,
  index,
  entering = false,
  winning = false,
  gone = false,
  disabled = false,
  flipMs,
  onPress,
}: {
  up: boolean;
  back?: TileBack;
  front?: ReactNode;
  frontClassName?: string;
  label: string;
  index: number;
  entering?: boolean;
  winning?: boolean;
  gone?: boolean;
  disabled?: boolean;
  flipMs: number;
  onPress?: () => void;
}) {
  const backStyle: React.CSSProperties =
    back === "wrong"
      ? { background: "#c8573f", boxShadow: "0 0 22px rgba(200,87,63,0.55)" }
      : back === "missed"
        ? { background: "color-mix(in srgb, var(--tint) 33%, transparent)", boxShadow: "inset 0 0 0 2px var(--tint)" }
        : back === "hidden"
          ? { background: "var(--tint)", boxShadow: "0 0 16px var(--glow)" }
          : { background: "var(--tint)", boxShadow: "0 0 26px var(--glow)" };
  if (gone) {
    return <span aria-hidden className="aspect-square w-full motion-safe:animate-[tile-out_.22s_ease-in_both]" />;
  }
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={label}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress?.();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPress?.();
        }
      }}
      className={cn(
        "group relative aspect-square w-full touch-manipulation outline-offset-2 [perspective:700px] disabled:cursor-default",
        "transition-transform duration-100 ease-out active:scale-[0.9]",
        entering && "motion-safe:animate-[tile-in_.34s_cubic-bezier(.2,.9,.3,1.25)_both]",
        winning && "motion-safe:animate-[tile-win_.5s_ease-out_both]",
      )}
      style={{ animationDelay: entering ? `${Math.min(index * 14, 160)}ms` : winning ? `${(index % 7) * 25}ms` : undefined }}
    >
      <span
        className="absolute inset-0 transition-transform ease-[cubic-bezier(.3,.7,.3,1)] [transform-style:preserve-3d]"
        style={{ transform: up ? "rotateY(180deg)" : "rotateY(0deg)", transitionDuration: `${flipMs}ms` }}
      >
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center rounded-[14px] [backface-visibility:hidden]",
            frontClassName ?? "bg-white/[0.09] ring-1 ring-inset ring-white/[0.05] group-enabled:group-hover:bg-white/[0.15]",
          )}
        >
          {front}
        </span>
        <span className="absolute inset-0 rounded-[14px] [backface-visibility:hidden] [transform:rotateY(180deg)]" style={backStyle} />
      </span>
    </button>
  );
}
