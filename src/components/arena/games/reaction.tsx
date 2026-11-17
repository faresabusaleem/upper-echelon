"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { REACTION_ATTEMPTS, REACTION_CEILING, reactionDelay } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { useArena } from "../fx";
import { GameIntro, Hud, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "waiting" | "go" | "shown" | "early" | "slow" | "result";

export function ReactionGame({ isMember, compact = false }: { isMember: boolean; compact?: boolean }) {
  const { begin, finish, submitting } = useGameSession("reaction", isMember);
  const [phase, setPhase] = useState<Phase>("intro");
  const [times, setTimes] = useState<number[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const goAt = useRef(0);
  // No sound accompanies the signal itself: this trial measures reaction to sight, not sound.
  const { stageRef, fx } = useArena(GAME_THEMES.reaction.tint);

  const arm = useCallback(() => {
    setPhase("waiting");
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setPhase("go"), reactionDelay());
  }, []);

  // Start timing when the gold field is committed, then refine to the frame it is painted on
  // (requestAnimationFrame may be throttled in background tabs, so never depend on it alone).
  useLayoutEffect(() => {
    if (phase !== "go") return;
    goAt.current = performance.now();
    const id = requestAnimationFrame(() => {
      goAt.current = performance.now();
    });
    return () => cancelAnimationFrame(id);
  }, [phase]);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const start = useCallback(async () => {
    setTimes([]);
    setLast(null);
    setOutcome(null);
    fx.start();
    await begin();
    arm();
    stageRef.current?.focus();
  }, [arm, begin, fx, stageRef]);

  const act = useCallback(async () => {
    if (phase === "waiting") {
      if (timer.current) clearTimeout(timer.current);
      setPhase("early");
      fx.life();
      return;
    }
    if (phase === "go") {
      const ms = Math.round(performance.now() - goAt.current);
      if (ms > REACTION_CEILING) {
        setPhase("slow");
        fx.miss();
        return;
      }
      const next = [...times, ms];
      setLast(ms);
      setTimes(next);
      if (next.length >= REACTION_ATTEMPTS) {
        setPhase("shown");
        fx.hit();
        const o = await finish({ times: next });
        setOutcome(o);
        setPhase("result");
        fx.end(o);
      } else {
        setPhase("shown");
        fx.hit();
      }
      return;
    }
    if (phase === "shown" || phase === "early" || phase === "slow") arm();
  }, [arm, finish, fx, phase, times]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) void act();
    }
  };

  if (phase === "intro") {
    return (
      <Stage kind="reaction" ref={stageRef} className={compact ? "min-h-[24rem]" : undefined}>
        <GameIntro kind="reaction" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage kind="reaction" ref={stageRef}>
        <ResultPanel
          kind="reaction"
          outcome={outcome}
          onAgain={start}
          isMember={isMember}
          extra={
            <p className="figure text-small">
              Attempts: {(outcome.details.times as number[] | undefined)?.join(" · ") ?? times.join(" · ")} ms
            </p>
          }
        />
      </Stage>
    );
  }

  const tone = phase === "go" ? "go" : phase === "early" || phase === "slow" ? "alarm" : "deep";
  return (
    <Stage
      kind="reaction"
      ref={stageRef}
      tone={tone}
      tabIndex={0}
      role="button"
      aria-label={phase === "go" ? "Now. Press." : "Reaction field"}
      onPointerDown={(e) => {
        if (e.button === 0) void act();
      }}
      onKeyDown={onKey}
      className={compact ? "min-h-[24rem] cursor-pointer" : "cursor-pointer"}
    >
      <Hud
        level={Math.min(times.length + 1, REACTION_ATTEMPTS)}
        levelLabel={`Attempt of ${REACTION_ATTEMPTS}`}
        items={times.length ? [{ label: "Average", value: `${Math.round(times.reduce((a, b) => a + b, 0) / times.length)} ms` }] : []}
      />
      <div aria-live="assertive" className="text-center">
        {phase === "waiting" && (
          <>
            <span aria-hidden className="mx-auto mb-6 block size-16 rounded-full border-2 border-[var(--tint)]/50 motion-safe:animate-ping" />
            <p className="font-display text-[clamp(2.6rem,6vw,4.2rem)] leading-none">Wait for gold.</p>
            <p className="mt-3 text-white/60">Do not move yet.</p>
          </>
        )}
        {phase === "go" && <p className="font-display text-[clamp(4rem,12vw,8rem)] leading-none">Now!</p>}
        {phase === "shown" && last != null && (
          <>
            <p className="figure text-[clamp(3.5rem,12vw,7rem)] leading-none">{last} ms</p>
            <p className="mt-4 text-white/60">{submitting ? "Saving…" : "Press to continue."}</p>
          </>
        )}
        {phase === "early" && (
          <>
            <p className="font-display text-[clamp(2.6rem,6vw,4.2rem)] leading-none">Too soon.</p>
            <p className="mt-3 text-white/70">That attempt does not count. Press to try again.</p>
          </>
        )}
        {phase === "slow" && (
          <>
            <p className="font-display text-[clamp(2.6rem,6vw,4.2rem)] leading-none">Too slow.</p>
            <p className="mt-3 text-white/70">Over five seconds does not count. Press to try again.</p>
          </>
        )}
        {phase === "result" && <p className="text-white/70">Weighing the result…</p>}
      </div>
    </Stage>
  );
}
