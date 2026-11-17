import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GAMES, GAME_LIST, dailyGame, gameBySlug } from "@/lib/games/catalog";
import { GamePlayer } from "@/components/arena/game-player";
import { HistoryChart } from "@/components/charts/history-chart";
import { DistributionChart } from "@/components/charts/distribution-chart";
import { Avatar } from "@/components/ui/avatar";
import { Sigil } from "@/components/ui/sigils";
import { Crumbs } from "@/components/hub/hub-page";
import { tierColor } from "@/components/hub/sidebar";
import { GAME_THEMES } from "@/lib/games/themes";
import { ordinal } from "@/lib/utils";

export async function generateStaticParams() {
  return GAME_LIST.map((g) => ({ game: g.slug }));
}

export async function generateMetadata({ params }: PageProps<"/arena/[game]">): Promise<Metadata> {
  const g = gameBySlug((await params).game);
  if (!g) return {};
  return { title: g.name, description: `${g.line} ${g.measures}` };
}

export default async function GamePage({ params }: PageProps<"/arena/[game]">) {
  const g = gameBySlug((await params).game);
  if (!g) notFound();
  const viewer = await getViewer();
  const isMember = !!viewer?.profile.onboarded_at && !viewer.ban;
  const supabase = await createClient();

  const [{ data: dist }, { data: top }, mine] = await Promise.all([
    supabase.rpc("game_distribution", { g: g.kind, lo: g.distribution.lo, hi: g.distribution.hi, buckets: 24 }),
    supabase.rpc("leaderboard", { g: g.kind, period: "all", lim: 5 }),
    viewer
      ? Promise.all([
          supabase
            .from("game_results")
            .select("score, created_at")
            .eq("user_id", viewer.id)
            .eq("game", g.kind)
            .eq("is_flagged", false)
            .order("created_at", { ascending: false })
            .limit(120),
          supabase.from("game_bests").select("*").eq("user_id", viewer.id).eq("game", g.kind).maybeSingle(),
        ])
      : null,
  ]);

  const history = (mine?.[0].data ?? []).map((r) => ({ at: r.created_at, score: Number(r.score) })).reverse();
  const best = mine?.[1].data ?? null;
  let bestPct: number | null = null;
  if (best) {
    const { data } = await supabase.rpc("game_percentile", { g: g.kind, s: Number(best.best_score) });
    bestPct = data == null ? null : Number(data);
  }
  const isDaily = dailyGame() === g.kind;

  const theme = GAME_THEMES[g.kind];

  return (
    <div className="mx-auto flex w-full max-w-[92rem] flex-col gap-6 px-[var(--gutter)] pb-14 pt-5">
      <Crumbs items={[{ href: "/", label: "Upper Echelon" }, { href: "/arena", label: "Arena" }, { label: g.name }]} />
      <div className="flex flex-wrap items-center gap-3">
        <span className="inline-flex size-11 items-center justify-center rounded-xl" style={{ background: `${theme.tint}22`, color: theme.tint }}>
          <Sigil name={theme.sigil} size={24} />
        </span>
        <h1 className="font-display text-[clamp(1.9rem,3.2vw,2.6rem)] leading-none text-ink">{g.name}</h1>
        {isDaily && <span className="chip bg-gold text-ground">Daily challenge</span>}
        <p className="w-full max-w-[70ch] text-ink-2">{g.measures}</p>
      </div>

      <GamePlayer kind={g.kind} isMember={isMember} />

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="record" className="panel">
          <h2 id="record" className="panel-head">
            {viewer ? "Your record" : "Where members stand"}
          </h2>
          <div className="p-5">
            {viewer && best ? (
              <>
                <dl className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    ["Personal best", <>{Number(best.best_score).toFixed(g.decimals)} <span className="text-base text-muted">{g.unit}</span></>],
                    ["Percentile", bestPct == null ? "—" : ordinal(bestPct)],
                    ["Rating", best.best_rating],
                    ["Trials", best.plays],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-xl bg-panel px-4 py-3">
                      <dt className="text-micro text-muted">{label}</dt>
                      <dd className="figure mt-1 text-2xl text-ink">{value}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6">
                  <HistoryChart points={history} lowerIsBetter={g.lowerIsBetter} unit={g.unit} />
                </div>
              </>
            ) : (
              <p className="max-w-[52ch] text-muted">
                {viewer ? "Finish a trial and your record begins here." : "Members see their history and percentile here."}
              </p>
            )}
            <div className="mt-6">
              <DistributionChart
                buckets={(dist ?? []).map((d) => ({ bucket: d.bucket, members: Number(d.members) }))}
                lo={g.distribution.lo}
                hi={g.distribution.hi}
                mark={best ? Number(best.best_score) : null}
                unit={g.unit}
              />
            </div>
          </div>
        </section>

        <section aria-labelledby="board" className="panel">
          <h2 id="board" className="panel-head">
            The board
            <Link href={`/leaderboards?game=${g.kind}`} className="font-sans text-small text-gold hover:text-gold-bright">
              Full leaderboard →
            </Link>
          </h2>
          {top && top.length > 0 ? (
            <ol className="rows">
              {top.map((row) => (
                <li key={row.user_id} className="flex items-center gap-3 px-4 py-3">
                  <span className={`figure w-6 text-right ${row.rank <= 3 ? "text-gold" : "text-muted"}`}>{row.rank}</span>
                  <Avatar src={row.avatar_url} name={row.display_name} size={32} />
                  <Link href={`/u/${row.username}`} className="min-w-0 flex-1 truncate hover:underline" style={{ color: tierColor(row.tier) }}>
                    {row.display_name}
                  </Link>
                  <span className="figure text-ink">
                    {Number(row.score).toFixed(GAMES[g.kind].decimals)} <span className="text-muted">{g.unit}</span>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="px-5 py-6 text-muted">The board is empty. The first name on it could be yours.</p>
          )}
        </section>
      </div>
    </div>
  );
}
