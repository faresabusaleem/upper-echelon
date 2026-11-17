import Link from "next/link";
import type { GameKind } from "@/lib/games/catalog";
import { GAMES } from "@/lib/games/catalog";
import { GAME_THEMES } from "@/lib/games/themes";
import { Sigil } from "@/components/ui/sigils";
import { cn } from "@/lib/utils";

/**
 * A trial as an inviting tile: its colour, its sigil, and (for members) the best result so far.
 * Every card fills its grid cell, so a row of cards always lines up whatever the text length.
 */
export function TrialCard({
  kind,
  best,
  daily = false,
  compact = false,
}: {
  kind: GameKind;
  best?: string | null;
  daily?: boolean;
  compact?: boolean;
}) {
  const g = GAMES[kind];
  const t = GAME_THEMES[kind];
  return (
    <Link
      href={`/arena/${g.slug}`}
      className={cn(
        "group relative isolate flex h-full flex-col overflow-hidden rounded-2xl border border-white/[0.07] p-4 transition-[transform,box-shadow,border-color] duration-200 ease-[var(--ease-out-soft)]",
        "hover:-translate-y-1 hover:border-white/[0.14] hover:shadow-[0_18px_40px_-14px_var(--glow)] focus-visible:-translate-y-1",
        compact ? "min-h-[8.75rem]" : "min-h-[12rem] sm:p-5",
      )}
      style={
        {
          background: `radial-gradient(120% 90% at 100% 0%, ${t.tint}24 0%, transparent 55%), linear-gradient(160deg, ${t.stage} 0%, #121216 100%)`,
          "--glow": t.glow,
        } as React.CSSProperties
      }
    >
      {/* A faint, large sigil behind the text: kept inside the card and clear of the controls. */}
      <span
        aria-hidden
        className="pointer-events-none absolute -right-5 top-1/2 -z-10 -translate-y-[58%] opacity-[0.07] transition-transform duration-300 group-hover:rotate-[-6deg] group-hover:scale-105"
        style={{ color: t.tint }}
      >
        <Sigil name={t.sigil} size={compact ? 92 : 118} strokeWidth={1.2} />
      </span>

      <span className="flex items-start justify-between gap-2">
        <span className="inline-flex size-10 items-center justify-center rounded-xl" style={{ background: `${t.tint}22`, color: t.tint }}>
          <Sigil name={t.sigil} size={22} />
        </span>
        {daily && <span className="chip bg-gold text-ground">Daily challenge</span>}
      </span>

      <span className="mt-auto block pt-5">
        <span className="block truncate font-display text-[1.45rem] leading-tight text-white">{g.name}</span>
        {!compact && <span className="mt-1 line-clamp-2 block min-h-[2.75em] text-small leading-snug text-white/65">{g.line}</span>}
      </span>

      <span className="mt-3 flex items-center justify-between gap-2 text-micro">
        <span className="min-w-0 truncate text-white/55">
          {best ? (
            <>
              Your best <span className="figure text-white/90">{best}</span>
            </>
          ) : (
            "Not yet played"
          )}
        </span>
        <span
          className="shrink-0 rounded-full px-3 py-1 font-semibold shadow-[0_6px_16px_-6px_var(--glow)] transition-transform group-hover:scale-105"
          style={{ background: t.tint, color: t.stage }}
        >
          Play
        </span>
      </span>
    </Link>
  );
}
