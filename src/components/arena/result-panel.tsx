"use client";

import Link from "next/link";
import { GAMES, type GameKind } from "@/lib/games/catalog";
import { tierInfo } from "@/lib/tiers";
import { Button, ButtonLink } from "@/components/ui/button";
import { Notice } from "@/components/ui/notice";
import type { GameOutcome } from "./use-game-session";

export function ResultPanel({
  kind,
  outcome,
  onAgain,
  isMember,
  extra,
}: {
  kind: GameKind;
  outcome: GameOutcome;
  onAgain: () => void;
  isMember: boolean;
  extra?: React.ReactNode;
}) {
  const g = GAMES[kind];
  const pct = outcome.percentile;
  const comparison =
    pct == null || outcome.population < 2
      ? "Too few members have played this yet for a fair comparison."
      : g.lowerIsBetter
        ? `Faster than ${Math.round(pct)}% of members.`
        : `Better than ${Math.round(pct)}% of members.`;
  const promoted = outcome.tier != null && outcome.tierBefore != null && outcome.tier > outcome.tierBefore;

  if (outcome.invalid) {
    return (
      <div className="flex w-full flex-col items-start gap-6" role="status" aria-live="polite">
        <div>
          <p className="text-small text-muted">{g.name}</p>
          <p className="mt-2 font-display text-display-l text-ink">Not scored.</p>
          <p className="mt-3 text-lede text-ink-2">{outcome.invalid}</p>
        </div>
        {extra}
        <div className="flex flex-wrap items-center gap-4">
          <Button onClick={onAgain} autoFocus>
            Try again
          </Button>
          <Link href="/arena" className="text-ink-2 underline hover:text-ink">
            All trials
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-start gap-8" role="status" aria-live="polite">
      <div>
        <p className="text-small text-muted">{g.name}</p>
        <p className="mt-2 flex items-baseline gap-3">
          <span className="figure text-[clamp(4rem,14vw,9rem)] leading-none text-ink">
            {outcome.score.toFixed(g.decimals)}
          </span>
          <span className="text-lede text-ink-2">{g.unit}</span>
        </p>
        <p className="mt-4 text-lede text-ink-2">{comparison}</p>
        {outcome.personalBest && <p className="mt-2 text-gold-bright">A new personal best.</p>}
      </div>

      <div className="w-full max-w-md">
        <div className="flex justify-between text-micro text-muted">
          <span>Rating</span>
          <span className="figure text-ink-2">{outcome.rating} / 100</span>
        </div>
        <div className="mt-2 h-1.5 w-full bg-panel-3">
          <div className="h-full bg-gold transition-[width] duration-[900ms]" style={{ width: `${outcome.rating}%` }} />
        </div>
      </div>

      {promoted && outcome.tier && (
        <Notice tone="warning" title={`You have risen to ${tierInfo(outcome.tier).name}.`}>
          A new tier, new marks and new themes are yours.
        </Notice>
      )}
      {outcome.saved && outcome.flagged && (
        <Notice tone="warning" title="Saved for review.">
          This result is outside what the house considers humanly plausible, so it will not appear on leaderboards
          unless a moderator clears it.
        </Notice>
      )}
      {outcome.error && (
        <Notice tone={outcome.rateLimited ? "warning" : "error"} title="Not saved.">
          {outcome.error}
        </Notice>
      )}
      {outcome.saved && (
        <p className="text-small text-muted">
          Saved to your record{outcome.isDaily ? " · today’s challenge complete" : ""}
          {outcome.streak > 0 ? ` · ${outcome.streak}-day streak` : ""}.
        </p>
      )}
      {!isMember && (
        <div className="bg-raised px-5 py-4">
          <p className="text-ink">Results are not kept for visitors.</p>
          <p className="mt-1 text-small text-muted">Members keep a record, a percentile and a rank.</p>
          <ButtonLink href="/join" size="sm" className="mt-4">
            Begin your initiation
          </ButtonLink>
        </div>
      )}
      {extra}
      <div className="flex flex-wrap items-center gap-4">
        <Button onClick={onAgain} autoFocus>
          Try again
        </Button>
        <ButtonLink href={`/leaderboards?game=${kind}`} variant="secondary">
          Leaderboard
        </ButtonLink>
        <Link href="/arena" className="text-ink-2 underline hover:text-ink">
          All trials
        </Link>
      </div>
    </div>
  );
}
