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
import { TierMark } from "@/components/ui/tier-mark";
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

  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-10 sm:pt-14">
      <nav aria-label="Breadcrumb" className="text-small text-muted">
        <Link href="/arena" className="hover:text-ink">
          The Arena
        </Link>
        {isDaily && <span className="ml-3 text-gold-bright">Today’s challenge</span>}
      </nav>
      <h1 className="mt-3 font-display text-display-l text-ink">{g.name}</h1>
      <p className="mt-3 max-w-[60ch] text-ink-2">{g.measures}</p>

      <div className="mt-10">
        <GamePlayer kind={g.kind} isMember={isMember} />
      </div>

      <div className="mt-20 grid gap-16 lg:grid-cols-[1.4fr_1fr]">
        <section aria-labelledby="record">
          <h2 id="record" className="font-display text-display-s text-ink">
            {viewer ? "Your record" : "Where members stand"}
          </h2>
          {viewer && best ? (
            <>
              <dl className="mt-6 grid grid-cols-2 gap-6 sm:grid-cols-4">
                <div>
                  <dt className="text-small text-muted">Personal best</dt>
                  <dd className="figure mt-1 text-2xl text-ink">
                    {Number(best.best_score).toFixed(g.decimals)} <span className="text-base text-muted">{g.unit}</span>
                  </dd>
                </div>
                <div>
                  <dt className="text-small text-muted">Percentile</dt>
                  <dd className="figure mt-1 text-2xl text-ink">{bestPct == null ? "—" : ordinal(bestPct)}</dd>
                </div>
                <div>
                  <dt className="text-small text-muted">Rating</dt>
                  <dd className="figure mt-1 text-2xl text-ink">{best.best_rating}</dd>
                </div>
                <div>
                  <dt className="text-small text-muted">Trials</dt>
                  <dd className="figure mt-1 text-2xl text-ink">{best.plays}</dd>
                </div>
              </dl>
              <div className="mt-10">
                <HistoryChart points={history} lowerIsBetter={g.lowerIsBetter} unit={g.unit} />
              </div>
            </>
          ) : (
            <p className="mt-4 max-w-[52ch] text-muted">
              {viewer ? "Finish a trial and your record begins here." : "Members see their history and percentile here."}
            </p>
          )}
          <div className="mt-12">
            <DistributionChart
              buckets={(dist ?? []).map((d) => ({ bucket: d.bucket, members: Number(d.members) }))}
              lo={g.distribution.lo}
              hi={g.distribution.hi}
              mark={best ? Number(best.best_score) : null}
              unit={g.unit}
            />
          </div>
        </section>

        <section aria-labelledby="board">
          <div className="flex items-baseline justify-between">
            <h2 id="board" className="font-display text-display-s text-ink">
              The board
            </h2>
            <Link href={`/leaderboards?game=${g.kind}`} className="text-small text-ink-2 underline hover:text-ink">
              Full leaderboard
            </Link>
          </div>
          {top && top.length > 0 ? (
            <ol className="mt-6 flex flex-col">
              {top.map((row) => (
                <li key={row.user_id} className="flex items-center gap-4 py-3">
                  <span className="figure w-6 text-muted">{row.rank}</span>
                  <Avatar src={row.avatar_url} name={row.display_name} size={32} />
                  <Link href={`/u/${row.username}`} className="min-w-0 flex-1 truncate text-ink hover:text-gold-bright">
                    {row.display_name}
                  </Link>
                  <TierMark tier={row.tier} />
                  <span className="figure text-ink">
                    {Number(row.score).toFixed(GAMES[g.kind].decimals)} {g.unit}
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="mt-6 text-muted">The board is empty. The first name on it could be yours.</p>
          )}
        </section>
      </div>
    </div>
  );
}
