import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GAME_LIST, GAMES, dailyGame, type GameKind } from "@/lib/games/catalog";
import { ArrowRightIcon } from "@/components/ui/icons";
import { ButtonLink } from "@/components/ui/button";

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

  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-12 sm:pt-20">
      <div className="grid gap-10 lg:grid-cols-[1fr_minmax(0,28rem)] lg:items-end">
        <div>
          <h1 className="font-display text-display-xl text-ink">The Arena</h1>
          <p className="mt-6 max-w-[46ch] text-lede text-ink-2">
            Eight trials from the cognitive-psychology laboratory, timed to the millisecond. Play any of them as a
            visitor; members keep a record, a percentile and a place on the board.
          </p>
        </div>
        <section aria-labelledby="daily" className="bg-gold-wash px-6 py-6 sm:px-8">
          <h2 id="daily" className="font-display text-display-s text-ink">
            Today’s challenge: {daily.name}
          </h2>
          <p className="mt-2 text-ink-2">
            {doneToday
              ? "Done for today. It changes at midnight UTC."
              : "One trial, the same for every member. Complete it to keep your discipline."}
            {viewer && streak > 0 && ` Your streak: ${streak} ${streak === 1 ? "day" : "days"}.`}
          </p>
          <ButtonLink href={`/arena/${daily.slug}`} className="mt-5" variant={doneToday ? "secondary" : "primary"}>
            {doneToday ? "Play again" : "Take today’s trial"}
          </ButtonLink>
        </section>
      </div>

      <ol className="mt-16 sm:mt-24">
        {GAME_LIST.map((g, i) => {
          const mine = bests.get(g.kind);
          return (
            <li key={g.kind} data-reveal style={{ ["--reveal-i" as string]: i % 4 }}>
              <Link
                href={`/arena/${g.slug}`}
                className="group grid grid-cols-[1fr_auto] items-center gap-x-6 gap-y-1 py-6 transition-colors duration-200 hover:bg-raised sm:grid-cols-[minmax(0,1.1fr)_minmax(0,1.4fr)_10rem_auto] sm:px-4"
              >
                <span className="col-start-1 row-start-1 font-display text-display-m leading-none text-ink transition-colors group-hover:text-gold-bright sm:col-auto sm:row-auto">
                  {g.name}
                </span>
                <span className="col-span-2 row-start-2 text-ink-2 sm:col-span-1 sm:row-start-auto">{g.measures}</span>
                <span className="col-span-2 row-start-3 text-small sm:col-span-1 sm:row-start-auto sm:text-right">
                  {mine ? (
                    <>
                      <span className="text-muted">Your best </span>
                      <span className="figure text-ink">
                        {mine.best.toFixed(g.decimals)} {g.unit}
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">{viewer ? "Not yet played" : g.line}</span>
                  )}
                </span>
                <ArrowRightIcon className="col-start-2 row-start-1 text-muted transition-transform duration-200 group-hover:translate-x-1 group-hover:text-ink sm:col-auto sm:row-auto" />
              </Link>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
