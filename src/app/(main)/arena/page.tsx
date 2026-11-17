import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GAME_KINDS, GAMES, dailyGame, formatScore, type GameKind } from "@/lib/games/catalog";
import { GAME_THEMES } from "@/lib/games/themes";
import { TrialCard } from "@/components/arena/trial-card";
import { Crumbs, HubPage, PageHead } from "@/components/hub/hub-page";
import { Flame, Sigil } from "@/components/ui/sigils";

export const metadata: Metadata = {
  title: "The Arena",
  description: "Eight cognitive trials: reaction, memory, aim, attention and speed. Measured precisely, compared fairly.",
};

export default async function ArenaPage() {
  const viewer = await getViewer();
  const today = dailyGame();
  const bests = new Map<GameKind, { best: number; plays: number }>();
  let doneToday = false;
  let streak = 0;
  if (viewer) {
    const supabase = await createClient();
    const [{ data }, { data: day }, { data: s }] = await Promise.all([
      supabase.from("game_bests").select("game, best_score, plays").eq("user_id", viewer.id),
      supabase
        .from("member_days")
        .select("daily_done")
        .eq("user_id", viewer.id)
        .eq("day", new Date().toISOString().slice(0, 10))
        .maybeSingle(),
      supabase.rpc("current_streak", { uid: viewer.id }),
    ]);
    for (const row of data ?? []) bests.set(row.game, { best: Number(row.best_score), plays: row.plays });
    doneToday = !!day?.daily_done;
    streak = s ?? 0;
  }
  const daily = GAMES[today];
  const t = GAME_THEMES[today];

  return (
    <HubPage>
      <Crumbs items={[{ href: "/", label: "Upper Echelon" }, { label: "Arena" }]} />
      <PageHead
        title="The Arena"
        lede="Eight trials from the cognitive-psychology laboratory, timed to the millisecond. Visitors may play; members keep a record, a percentile and a place on the board."
      />

      <Link
        href={`/arena/${daily.slug}`}
        className="group relative flex flex-wrap items-center gap-5 overflow-hidden rounded-[18px] border border-white/[0.07] p-5 transition-transform hover:-translate-y-0.5 sm:p-6"
        style={{ background: `radial-gradient(90% 140% at 0% 0%, ${t.tint}33 0%, transparent 60%), linear-gradient(120deg, ${t.stage}, #141418)` }}
      >
        <span className="inline-flex size-16 items-center justify-center rounded-2xl" style={{ background: `${t.tint}26`, color: t.tint, boxShadow: `0 0 40px ${t.glow}` }}>
          <Sigil name={t.sigil} size={32} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-micro uppercase tracking-[0.2em]" style={{ color: t.tint }}>
            Today&rsquo;s rite
          </span>
          <span className="mt-1 block font-display text-[clamp(1.7rem,3vw,2.3rem)] leading-tight text-white">{daily.name}</span>
          <span className="mt-1 block text-small text-white/65">
            {doneToday ? "Kept for today. A new rite at midnight UTC." : "One trial, the same for every member. Keep it daily to keep your streak alive."}
          </span>
        </span>
        <span className="flex items-center gap-4">
          {viewer && (
            <span className="flex items-center gap-1.5 text-white" title="Your streak">
              <Flame lit={streak > 0} size={24} />
              <span className="figure text-2xl">{streak}</span>
              <span className="text-micro text-white/55">{streak === 1 ? "day" : "days"}</span>
            </span>
          )}
          <span className="rounded-2xl px-6 py-3 font-semibold transition-[filter] group-hover:brightness-110" style={{ background: t.tint, color: t.stage }}>
            {doneToday ? "Play again" : "Begin the rite"}
          </span>
        </span>
      </Link>

      <ol className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4" aria-label="The eight trials">
        {GAME_KINDS.map((k) => {
          const mine = bests.get(k);
          return (
            <li key={k}>
              <TrialCard kind={k} daily={k === today} best={mine ? formatScore(k, mine.best) : null} />
            </li>
          );
        })}
      </ol>
    </HubPage>
  );
}
