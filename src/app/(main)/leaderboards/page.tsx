import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { GAME_LIST, GAMES, isGameKind, type GameKind } from "@/lib/games/catalog";
import { TIERS } from "@/lib/tiers";
import { Avatar } from "@/components/ui/avatar";
import { Empty } from "@/components/ui/empty";
import { TierMark } from "@/components/ui/tier-mark";
import { cn, formatShortDate } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Leaderboards",
  description: "The best results in the Arena: all time, this week, today, and by tier.",
};

const PERIODS = [
  ["all", "All time"],
  ["week", "This week"],
  ["day", "Today"],
] as const;

export default async function LeaderboardsPage({ searchParams }: PageProps<"/leaderboards">) {
  const sp = await searchParams;
  const game: GameKind = typeof sp.game === "string" && isGameKind(sp.game) ? sp.game : "reaction";
  const period = PERIODS.some(([p]) => p === sp.period) ? (sp.period as string) : "all";
  const tier = typeof sp.tier === "string" && /^[1-6]$/.test(sp.tier) ? Number(sp.tier) : null;
  const g = GAMES[game];
  const viewer = await getViewer();
  const supabase = await createClient();
  const { data: rows } = await supabase.rpc("leaderboard", { g: game, period, tier_filter: tier ?? undefined, lim: 100 });

  const href = (o: Partial<{ game: string; period: string; tier: number | null }>) => {
    const q = new URLSearchParams();
    q.set("game", o.game ?? game);
    const p = o.period ?? period;
    if (p !== "all") q.set("period", p);
    const t = o.tier === undefined ? tier : o.tier;
    if (t) q.set("tier", String(t));
    return `/leaderboards?${q.toString()}`;
  };
  const chip = (active: boolean) =>
    cn("shrink-0 px-3 py-2 text-small transition-colors", active ? "bg-gold text-ground" : "bg-panel text-ink-2 hover:bg-panel-2 hover:text-ink");

  return (
    <div className="mx-auto w-full max-w-[96rem] px-[var(--gutter)] pb-10 pt-12 sm:pt-20">
      <h1 className="font-display text-display-xl text-ink">The board</h1>
      <p className="mt-6 max-w-[52ch] text-lede text-ink-2">
        Each member’s best result. Results flagged as implausible, members who keep their results private, and
        suspended accounts are left out.
      </p>

      <nav aria-label="Trial" className="mt-12 flex gap-2 overflow-x-auto pb-2">
        {GAME_LIST.map((x) => (
          <Link key={x.kind} href={href({ game: x.kind })} aria-current={x.kind === game ? "page" : undefined} className={chip(x.kind === game)}>
            {x.name}
          </Link>
        ))}
      </nav>
      <div className="mt-3 flex flex-wrap gap-6">
        <nav aria-label="Period" className="flex gap-2">
          {PERIODS.map(([p, label]) => (
            <Link key={p} href={href({ period: p })} aria-current={p === period ? "page" : undefined} className={chip(p === period)}>
              {label}
            </Link>
          ))}
        </nav>
        <nav aria-label="Tier" className="flex flex-wrap gap-2">
          <Link href={href({ tier: null })} aria-current={!tier ? "page" : undefined} className={chip(!tier)}>
            All tiers
          </Link>
          {TIERS.map((t) => (
            <Link key={t.tier} href={href({ tier: t.tier })} aria-current={tier === t.tier ? "page" : undefined} className={chip(tier === t.tier)} title={t.name}>
              {t.numeral}
            </Link>
          ))}
        </nav>
      </div>

      <section aria-labelledby="board-h" className="mt-14">
        <h2 id="board-h" className="font-display text-display-m text-ink">
          {g.name} <span className="text-muted">· {PERIODS.find(([p]) => p === period)?.[1]}</span>
          {tier && <span className="text-muted"> · {TIERS[tier - 1].name}</span>}
        </h2>
        {rows && rows.length > 0 ? (
          <table className="mt-8 w-full text-left">
            <caption className="sr-only">
              {g.name} leaderboard, {g.lowerIsBetter ? "lower is better" : "higher is better"}
            </caption>
            <thead className="text-small text-muted">
              <tr>
                <th scope="col" className="w-14 pb-3 font-normal">Rank</th>
                <th scope="col" className="pb-3 font-normal">Member</th>
                <th scope="col" className="hidden pb-3 font-normal sm:table-cell">Tier</th>
                <th scope="col" className="hidden pb-3 font-normal md:table-cell">Set</th>
                <th scope="col" className="pb-3 text-right font-normal">{g.unitLong}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.user_id} className={cn("even:bg-raised", viewer?.id === r.user_id && "bg-gold-wash! text-ink")}>
                  <td className={cn("figure py-3 pl-2", r.rank <= 3 ? "text-gold" : "text-muted")}>{r.rank}</td>
                  <td className="py-3">
                    <Link href={`/u/${r.username}`} className="flex items-center gap-3 hover:text-gold-bright">
                      <Avatar src={r.avatar_url} name={r.display_name} size={32} />
                      <span className="min-w-0 truncate text-ink">{r.display_name}</span>
                      <span className="hidden text-small text-muted lg:inline">@{r.username}</span>
                    </Link>
                  </td>
                  <td className="hidden py-3 sm:table-cell">
                    <TierMark tier={r.tier} withName />
                  </td>
                  <td className="hidden py-3 text-small text-muted md:table-cell">{formatShortDate(r.achieved_at)}</td>
                  <td className="figure py-3 pr-2 text-right text-lg text-ink">{Number(r.score).toFixed(g.decimals)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <Empty title="No names on this board yet." className="mt-8" action={<Link href={`/arena/${g.slug}`} className="text-ink underline">Play {g.name}</Link>}>
            {period === "all" ? "Be the first to set a result." : "No results in this period yet."}
          </Empty>
        )}
      </section>
    </div>
  );
}
