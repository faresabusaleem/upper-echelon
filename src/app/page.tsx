import Link from "next/link";
import type { Metadata } from "next";
import { getViewer } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { notePresence } from "@/lib/presence";
import { GAME_KINDS, dailyGame, formatScore, type GameKind } from "@/lib/games/catalog";
import { TIERS, THEMES, nextTier, tierInfo } from "@/lib/tiers";
import { SiteHeader } from "@/components/layout/site-header";
import { SiteFooter } from "@/components/layout/site-footer";
import { HubPage } from "@/components/hub/hub-page";
import { ForumBoard } from "@/components/forum/board";
import { TrialCard } from "@/components/arena/trial-card";
import { ButtonLink } from "@/components/ui/button";
import { RankBadge, Sigil } from "@/components/ui/sigils";

export const metadata: Metadata = {
  title: { absolute: "Upper Echelon · A society for sharp minds" },
  description:
    "Eight cognitive trials, a directory of renowned IQ tests, and a forum where arguments are judged on their merit. Rise through six ranks.",
};

export default async function Home() {
  const viewer = await getViewer();
  await notePresence(viewer?.id ?? null);
  const supabase = await createClient();
  const { data: bests } = viewer
    ? await supabase.from("game_bests").select("game, best_score").eq("user_id", viewer.id)
    : { data: [] as Array<{ game: GameKind; best_score: number }> };
  const best = new Map((bests ?? []).map((b) => [b.game as GameKind, Number(b.best_score)]));
  const today = dailyGame();
  const member = viewer?.profile.onboarded_at ? viewer : null;

  return (
    <>
      <SiteHeader />
      <main id="main" className="flex flex-1 flex-col">
        <HubPage>
          <Banner member={member ? { name: member.profile.display_name, tier: member.profile.tier, score: member.profile.echelon_score } : null} />

          <section className="panel" aria-labelledby="arena-h">
            <h2 id="arena-h" className="panel-head">
              The Arena
              <Link href="/arena" className="font-sans text-small text-gold hover:text-gold-bright">
                All trials →
              </Link>
            </h2>
            <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-4 sm:p-4">
              {GAME_KINDS.map((k) => (
                <TrialCard key={k} kind={k} compact daily={k === today} best={best.has(k) ? formatScore(k, best.get(k)!) : null} />
              ))}
            </div>
          </section>

          <ForumBoard />
        </HubPage>
      </main>
      <SiteFooter />
    </>
  );
}

function Banner({ member }: { member: { name: string; tier: number; score: number } | null }) {
  const next = member ? nextTier(member.tier) : null;
  const here = member ? tierInfo(member.tier) : null;
  const pct =
    member && next && here ? Math.max(0, Math.min(100, ((member.score - here.threshold) / (next.threshold - here.threshold)) * 100)) : 100;
  return (
    <section
      className="relative overflow-hidden rounded-[18px] border border-line"
      style={{
        background:
          "radial-gradient(80% 120% at 0% 0%, rgba(194,161,95,0.16) 0%, transparent 60%), radial-gradient(70% 90% at 100% 100%, rgba(200,87,63,0.12) 0%, transparent 60%), linear-gradient(180deg, #17161b, #111114)",
      }}
    >
      {/* eslint-disable-next-line @next/next/no-img-element -- decorative SVG mark */}
      <img
        src="/brand/engraving-gold.svg"
        alt=""
        aria-hidden
        className="pointer-events-none absolute -right-24 top-1/2 hidden w-[30rem] -translate-y-1/2 opacity-[0.09] motion-safe:animate-[drift_30s_ease-in-out_infinite_alternate] md:block"
      />
      <div className="relative grid gap-6 p-6 sm:p-8 md:grid-cols-[1.35fr_1fr] md:items-center">
        <div>
          <p className="text-micro uppercase tracking-[0.22em] text-gold">A society for sharp minds</p>
          <h1 className="mt-2 font-display text-[clamp(2.2rem,4.6vw,3.6rem)] leading-[1.02] text-ink">
            {member ? `Welcome back, ${member.name}.` : "Enter the Echelon."}
          </h1>
          <p className="mt-3 max-w-[54ch] text-ink-2">
            {member
              ? "Your daily challenge awaits, the Circle is talking, and the halls have news. Every trial you play and every word you write moves you up."
              : "Eight trials of the mind, a directory of renowned tests, and halls where arguments are judged on their merit. Rise through six ranks; open the Inner Sanctum."}
          </p>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            {member ? (
              <>
                <ButtonLink href="/arena">Play the daily challenge</ButtonLink>
                <ButtonLink href="/home" variant="secondary">Your desk</ButtonLink>
              </>
            ) : (
              <>
                <ButtonLink href="/join">Begin your initiation</ButtonLink>
                <ButtonLink href="/arena" variant="secondary">Try a trial first</ButtonLink>
              </>
            )}
          </div>
        </div>

        {member && here ? (
          <div className="rounded-2xl border border-line bg-black/25 p-5 backdrop-blur-sm">
            <div className="flex items-center justify-between gap-3">
              <RankBadge tier={member.tier} />
              <span className="figure text-small text-ink-2">{member.score} / 1000</span>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-panel-3">
              <div className="h-full rounded-full bg-gradient-to-r from-gold-deep to-gold-bright" style={{ width: `${pct}%` }} />
            </div>
            <p className="mt-2 text-micro text-muted">
              {next ? `${next.threshold - member.score} points to ${next.name}.` : "The highest rank. The society bows."}
            </p>
          </div>
        ) : (
          <ol className="grid grid-cols-3 gap-2" aria-label="The six ranks">
            {TIERS.map((t) => (
              <li
                key={t.tier}
                className="flex flex-col items-center gap-1 rounded-xl border border-line bg-black/25 px-2 py-3 text-center"
                style={{ color: THEMES[t.theme].accent }}
              >
                <Sigil name={t.tier >= 5 ? "crown" : t.tier >= 3 ? "eye" : "candle"} size={20} />
                <span className="font-display text-lg leading-none">{t.numeral}</span>
                <span className="text-micro text-ink-2">{t.name}</span>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}
