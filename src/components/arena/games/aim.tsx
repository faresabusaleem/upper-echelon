"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AIM_TARGETS, aimTarget } from "@/lib/games/engine";
import { GameIntro, Readout, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "ready" | "playing" | "result";

export function AimGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("aim", isMember);
  const [phase, setPhase] = useState<Phase>("intro");
  const [target, setTarget] = useState<{ x: number; y: number } | null>(null);
  const [hits, setHits] = useState<number[]>([]);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [radius, setRadius] = useState(34);
  const fieldRef = useRef<HTMLDivElement>(null);
  const lastHit = useRef(0);

  const place = useCallback(
    (prev?: { x: number; y: number }) => {
      const el = fieldRef.current;
      if (!el) return;
      const { width, height } = el.getBoundingClientRect();
      setTarget(aimTarget(width, height, radius, Math.random, prev));
    },
    [radius],
  );

  useEffect(() => {
    const el = fieldRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const w = el.getBoundingClientRect().width;
      setRadius(w < 480 ? 28 : 34);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [phase]);

  const start = useCallback(async () => {
    setOutcome(null);
    setHits([]);
    setPhase("ready");
    await begin();
  }, [begin]);

  useEffect(() => {
    if (phase === "ready") {
      const el = fieldRef.current;
      if (el) {
        const { width, height } = el.getBoundingClientRect();
        setTarget({ x: width / 2, y: height / 2 });
      }
    }
  }, [phase]);

  const hit = useCallback(async () => {
    const now = performance.now();
    if (phase === "ready") {
      lastHit.current = now;
      setPhase("playing");
      place(target ?? undefined);
      return;
    }
    if (phase !== "playing") return;
    const dt = Math.round(now - lastHit.current);
    lastHit.current = now;
    const next = [...hits, dt];
    setHits(next);
    if (next.length >= AIM_TARGETS) {
      setTarget(null);
      setPhase("result");
      setOutcome(await finish({ times: next }));
    } else {
      place(target ?? undefined);
    }
  }, [finish, hits, phase, place, target]);

  if (phase === "intro") {
    return (
      <Stage className="items-start sm:px-14">
        <GameIntro kind="aim" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage className="items-start sm:px-14">
        <ResultPanel kind="aim" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  return (
    <Stage tone="deep" className="p-0!">
      <Readout items={[{ label: "Remaining", value: phase === "ready" ? AIM_TARGETS : AIM_TARGETS - hits.length }]} />
      <div ref={fieldRef} className="absolute inset-0 top-12">
        {phase === "ready" && (
          <p className="pointer-events-none absolute inset-x-0 top-[calc(50%+3.5rem)] text-center text-ink-2">
            Hit the mark to begin.
          </p>
        )}
        {target && (
          <button
            type="button"
            aria-label={phase === "ready" ? "Start: hit the first mark" : `Mark ${hits.length + 1} of ${AIM_TARGETS}`}
            onPointerDown={(e) => {
              e.preventDefault();
              void hit();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void hit();
              }
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold transition-transform duration-75 active:scale-90"
            style={{ left: target.x, top: target.y, width: radius * 2, height: radius * 2 }}
          >
            <span aria-hidden className="absolute inset-[30%] rounded-full bg-ground" />
            <span aria-hidden className="absolute inset-[44%] rounded-full bg-gold" />
          </button>
        )}
      </div>
    </Stage>
  );
}
