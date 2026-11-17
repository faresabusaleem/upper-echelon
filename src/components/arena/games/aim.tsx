"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AIM_TARGETS, aimTarget } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { useArena } from "../fx";
import { GameIntro, Hud, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "ready" | "playing" | "ending" | "result";
const T = GAME_THEMES.aim;

/** A ring that spreads from where a mark was struck. */
function ripple(field: HTMLElement | null, x: number, y: number) {
  if (!field || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
  const ring = document.createElement("span");
  ring.setAttribute("aria-hidden", "true");
  Object.assign(ring.style, {
    position: "absolute",
    left: `${x}px`,
    top: `${y}px`,
    width: "60px",
    height: "60px",
    borderRadius: "999px",
    border: `2px solid ${T.tint}`,
    pointerEvents: "none",
  });
  field.appendChild(ring);
  const a = ring.animate(
    [
      { transform: "translate(-50%, -50%) scale(0.6)", opacity: 0.9 },
      { transform: "translate(-50%, -50%) scale(2.2)", opacity: 0 },
    ],
    { duration: 420, easing: "ease-out" },
  );
  a.onfinish = () => ring.remove();
}

export function AimGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("aim", isMember);
  const { stageRef, fx } = useArena(T.tint);
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
    fx.start();
    await begin();
  }, [begin, fx]);

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
    if (target) ripple(fieldRef.current, target.x, target.y);
    if (phase === "ready") {
      lastHit.current = now;
      setPhase("playing");
      fx.tile(0);
      place(target ?? undefined);
      return;
    }
    if (phase !== "playing") return;
    const dt = Math.round(now - lastHit.current);
    lastHit.current = now;
    const next = [...hits, dt];
    setHits(next);
    // The pitch climbs as the round goes on; every tenth mark is a small milestone.
    if (next.length % 10 === 0 && next.length < AIM_TARGETS) fx.level();
    else fx.tile(next.length % 9);
    if (next.length >= AIM_TARGETS) {
      setTarget(null);
      setPhase("ending");
      const o = await finish({ times: next });
      setOutcome(o);
      setPhase("result");
      fx.end(o);
    } else {
      place(target ?? undefined);
    }
  }, [finish, fx, hits, phase, place, target]);

  if (phase === "intro") {
    return (
      <Stage kind="aim" ref={stageRef}>
        <GameIntro kind="aim" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage kind="aim" ref={stageRef}>
        <ResultPanel kind="aim" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  return (
    <Stage kind="aim" ref={stageRef} className="p-0!">
      <Hud level={phase === "ready" ? AIM_TARGETS : AIM_TARGETS - hits.length} levelLabel="Remaining" />
      <div ref={fieldRef} className="absolute inset-0 top-16">
        {phase === "ready" && (
          <p className="pointer-events-none absolute inset-x-0 top-[calc(50%+3.5rem)] text-center text-white/70">Strike the mark to begin.</p>
        )}
        {target && (
          <button
            key={`${target.x}-${target.y}`}
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
            className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full transition-transform duration-75 active:scale-90 motion-safe:animate-[pop_.18s_ease-out]"
            style={{
              left: target.x,
              top: target.y,
              width: radius * 2,
              height: radius * 2,
              background: T.tint,
              boxShadow: `0 0 0 6px ${T.tint}33, 0 0 30px ${T.glow}`,
            }}
          >
            <span aria-hidden className="absolute inset-[22%] rounded-full" style={{ background: T.stage }} />
            <span aria-hidden className="absolute inset-[40%] rounded-full bg-white" />
          </button>
        )}
      </div>
    </Stage>
  );
}
