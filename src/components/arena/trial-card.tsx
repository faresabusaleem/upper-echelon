import Link from "next/link";
import type { GameKind } from "@/lib/games/catalog";
import { GAMES } from "@/lib/games/catalog";
import { GAME_THEMES } from "@/lib/games/themes";
import { Sigil } from "@/components/ui/sigils";
import { cn } from "@/lib/utils";

/** A trial as an inviting tile: its colour, its sigil, and (for members) the best result so far. */
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
        "group relative flex flex-col overflow-hidden rounded-2xl border border-white/[0.06] p-4 transition-[transform,box-shadow] duration-200 ease-[var(--ease-out-soft)]",
        "hover:-translate-y-1 hover:shadow-[0_18px_40px_-12px_var(--glow)] focus-visible:-translate-y-1",
        compact ? "min-h-[8.5rem]" : "min-h-[11rem] sm:p-5",
      )}
      style={
        {
          background: `radial-gradient(120% 90% at 100% 0%, ${t.tint}26 0%, transparent 55%), linear-gradient(160deg, ${t.stage} 0%, #121216 100%)`,
          "--glow": t.glow,
        } as React.CSSProperties
      }
    >
      <span
        aria-hidden
        className="absolute -bottom-6 -right-5 opacity-[0.13] transition-transform duration-300 group-hover:rotate-[-8deg] group-hover:scale-110"
        style={{ color: t.tint }}
      >
        <Sigil name={t.sigil} size={compact ? 96 : 128} strokeWidth={1.2} />
      </span>
      <span className="flex items-center justify-between gap-2">
        <span className="inline-flex size-10 items-center justify-center rounded-xl" style={{ background: `${t.tint}22`, color: t.tint }}>
          <Sigil name={t.sigil} size={22} />
        </span>
        {daily && <span className="chip bg-gold text-ground">Today&rsquo;s rite</span>}
      </span>
      <span className="mt-auto pt-4">
        <span className="block font-display text-[1.45rem] leading-tight text-white">{g.name}</span>
        {!compact && <span className="mt-1 block text-small text-white/65">{g.line}</span>}
        <span className="mt-2 flex items-center justify-between gap-2 text-micro">
          <span className="text-white/55">{best ? <>Your best <span className="figure text-white/90">{best}</span></> : "Not yet played"}</span>
          <span className="rounded-full px-2.5 py-1 font-medium transition-colors" style={{ background: t.tint, color: t.stage }}>
            Play
          </span>
        </span>
      </span>
    </Link>
  );
}
