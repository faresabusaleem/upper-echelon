"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { REACTION_ATTEMPTS, REACTION_CEILING, reactionDelay } from "@/lib/games/engine";
import { GameIntro, Readout, Stage } from "../game-ui";
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
  const stageRef = useRef<HTMLDivElement>(null);

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
    await begin();
    arm();
    stageRef.current?.focus();
  }, [arm, begin]);

  const act = useCallback(async () => {
    if (phase === "waiting") {
      if (timer.current) clearTimeout(timer.current);
      setPhase("early");
      return;
    }
    if (phase === "go") {
      const ms = Math.round(performance.now() - goAt.current);
      if (ms > REACTION_CEILING) {
        setPhase("slow");
        return;
      }
      const next = [...times, ms];
      setLast(ms);
      setTimes(next);
      if (next.length >= REACTION_ATTEMPTS) {
        setPhase("result");
        setOutcome(await finish({ times: next }));
      } else {
        setPhase("shown");
      }
      return;
    }
    if (phase === "shown" || phase === "early" || phase === "slow") arm();
  }, [arm, finish, phase, times]);

  const onKey = (e: React.KeyboardEvent) => {
    if (e.key === " " || e.key === "Enter") {
      e.preventDefault();
      if (!e.repeat) void act();
    }
  };

  if (phase === "intro") {
    return (
      <Stage tone="plate" className={compact ? "min-h-[24rem] items-start" : "items-start sm:px-14"}>
        <GameIntro kind="reaction" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage tone="plate" className="items-start sm:px-14">
        <ResultPanel
          kind="reaction"
          outcome={outcome}
          onAgain={start}
          isMember={isMember}
          extra={
            <p className="figure text-small text-muted">
              Attempts: {(outcome.details.times as number[] | undefined)?.join(" · ") ?? times.join(" · ")} ms
            </p>
          }
        />
      </Stage>
    );
  }

  const tone = phase === "go" ? "gold" : phase === "early" || phase === "slow" ? "alarm" : "deep";
  return (
    <Stage
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
      <Readout items={[{ label: "Attempt", value: `${Math.min(times.length + 1, REACTION_ATTEMPTS)} / ${REACTION_ATTEMPTS}` }]} />
      <div aria-live="assertive" className="text-center">
        {phase === "waiting" && (
          <>
            <p className="font-display text-display-l">Wait for gold.</p>
            <p className="mt-3 text-ink-2">Do not move yet.</p>
          </>
        )}
        {phase === "go" && <p className="font-display text-display-xl">Now.</p>}
        {phase === "shown" && last != null && (
          <>
            <p className="figure text-[clamp(3.5rem,12vw,7rem)] leading-none">{last} ms</p>
            <p className="mt-4 text-ink-2">{submitting ? "Saving…" : "Press to continue."}</p>
          </>
        )}
        {phase === "early" && (
          <>
            <p className="font-display text-display-l">Too soon.</p>
            <p className="mt-3 text-ink-2">That attempt does not count. Press to try again.</p>
          </>
        )}
        {phase === "slow" && (
          <>
            <p className="font-display text-display-l">Too slow.</p>
            <p className="mt-3 text-ink-2">Over five seconds does not count. Press to try again.</p>
          </>
        )}
        {phase === "result" && <p className="text-ink-2">Weighing the result…</p>}
      </div>
    </Stage>
  );
}
