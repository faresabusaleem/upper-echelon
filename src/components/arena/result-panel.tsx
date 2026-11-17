"use client";

import Link from "next/link";
import { useEffect } from "react";
import { GAMES, type GameKind } from "@/lib/games/catalog";
import { GAME_THEMES } from "@/lib/games/themes";
import { tierInfo } from "@/lib/tiers";
import type { GameOutcome } from "./use-game-session";

function Banner({ tone, title, children }: { tone: "gold" | "ember" | "plain"; title: string; children?: React.ReactNode }) {
  const tones = {
    gold: "bg-[#e7c97f]/15 text-[#f3dca0] ring-[#e7c97f]/30",
    ember: "bg-[#c8573f]/20 text-[#ffb7a3] ring-[#c8573f]/40",
    plain: "bg-black/25 text-white/85 ring-white/10",
  } as const;
  return (
    <div className={`w-full rounded-2xl px-4 py-3 text-left text-small ring-1 ${tones[tone]}`} role="status">
      <p className="font-medium">{title}</p>
      {children && <p className="mt-0.5 opacity-85">{children}</p>}
    </div>
  );
}

/** The end of a trial: the score, where it stands, and the next attempt one key away. */
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
  const t = GAME_THEMES[kind];

  // Space or Enter plays again, unless a button or link has focus (it handles the key itself).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null;
      if (el && (el.isContentEditable || ["INPUT", "TEXTAREA", "SELECT", "BUTTON", "A"].includes(el.tagName))) return;
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        onAgain();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onAgain]);

  const pct = outcome.percentile;
  const comparison =
    pct == null || outcome.population < 2
      ? "Too few members have played this yet for a fair comparison."
      : g.lowerIsBetter
        ? `Faster than ${Math.round(pct)}% of members.`
        : `Better than ${Math.round(pct)}% of members.`;
  const promoted = outcome.tier != null && outcome.tierBefore != null && outcome.tier > outcome.tierBefore;

  return (
    <div className="flex w-full max-w-lg flex-col items-center gap-5 text-center motion-safe:animate-[rise-in_.5s_cubic-bezier(.2,.8,.3,1)_both]" role="status" aria-live="polite">
      <p className="text-[0.7rem] uppercase tracking-[0.22em] text-white/55">{g.name}</p>

      {outcome.invalid ? (
        <>
          <p className="font-display text-[clamp(2.6rem,7vw,4rem)] leading-none">Not scored.</p>
          <p className="max-w-[40ch] text-white/75">{outcome.invalid}</p>
        </>
      ) : (
        <>
          <p className="flex items-baseline justify-center gap-2">
            <span className="figure text-[clamp(4.5rem,15vw,8rem)] leading-[0.9] motion-safe:animate-[count-up_.6s_ease-out_both]" style={{ textShadow: `0 0 40px ${t.glow}` }}>
              {outcome.score.toFixed(g.decimals)}
            </span>
            <span className="text-2xl text-white/65">{g.unit}</span>
          </p>
          {outcome.personalBest && (
            <span className="rounded-full bg-[#e7c97f] px-3 py-1 text-small font-semibold text-[#1a1408] shadow-[0_0_30px_rgba(231,201,127,0.5)]">
              A new personal best
            </span>
          )}
          <p className="text-white/80">{comparison}</p>
          <div className="w-full max-w-sm">
            <div className="flex justify-between text-micro text-white/55">
              <span>Rating</span>
              <span className="figure text-white/85">{outcome.rating} / 100</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-[width] duration-[1100ms] ease-out"
                style={{ width: `${outcome.rating}%`, background: `linear-gradient(90deg, ${t.tint}aa, ${t.tint})`, boxShadow: `0 0 16px ${t.glow}` }}
              />
            </div>
          </div>
        </>
      )}

      {promoted && outcome.tier && (
        <Banner tone="gold" title={`You have risen to ${tierInfo(outcome.tier).name}.`}>A new tier, new marks and new themes are yours.</Banner>
      )}
      {outcome.saved && outcome.flagged && (
        <Banner tone="gold" title="Saved for review.">
          This result is outside what the house considers humanly plausible, so it stays off the leaderboards unless a moderator clears it.
        </Banner>
      )}
      {outcome.error && (
        <Banner tone={outcome.rateLimited ? "gold" : "ember"} title="Not saved.">
          {outcome.error}
        </Banner>
      )}
      {outcome.saved && (
        <p className="text-small text-white/65">
          Saved to your record{outcome.isDaily ? " · daily challenge complete" : ""}
          {outcome.streak > 0 ? ` · ${outcome.streak}-day streak` : ""}.
        </p>
      )}

      <div className="flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={onAgain}
          autoFocus
          className="inline-flex h-13 items-center gap-2 rounded-2xl px-8 text-[1.02rem] font-semibold transition-[transform,filter] duration-150 hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97]"
          style={{ background: t.tint, color: t.stage, boxShadow: `0 12px 30px -10px ${t.glow}` }}
        >
          Again
          <kbd className="rounded-md bg-black/15 px-1.5 py-0.5 font-sans text-micro">Space</kbd>
        </button>
        <Link href={`/leaderboards?game=${kind}`} className="inline-flex h-13 items-center rounded-2xl bg-white/10 px-6 text-small font-medium text-white hover:bg-white/15">
          Leaderboard
        </Link>
        <Link href="/arena" className="text-small text-white/70 underline-offset-4 hover:text-white hover:underline">
          All trials
        </Link>
      </div>

      {!isMember && (
        <div className="w-full rounded-2xl bg-black/25 px-5 py-4 ring-1 ring-white/10">
          <p className="text-white">Visitors&rsquo; results are not kept.</p>
          <p className="mt-1 text-small text-white/60">Members keep a record, a percentile, a streak and a place on the board.</p>
          <Link
            href="/join"
            className="mt-3 inline-flex h-10 items-center rounded-xl bg-[#c2a15f] px-4 text-small font-semibold text-[#141414] hover:bg-[#d6bb80]"
          >
            Begin your initiation
          </Link>
        </div>
      )}
      {extra && <div className="text-white/60">{extra}</div>}
    </div>
  );
}
