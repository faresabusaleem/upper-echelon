"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VISUAL_LIVES, VISUAL_MISSES_PER_ROUND, visualGridSize, visualPattern } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { useArena } from "../fx";
import { GameIntro, Hud, Stage, tileClass } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "show" | "input" | "between" | "result";

export function VisualGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("visual", isMember);
  const { stageRef, fx } = useArena(GAME_THEMES.visual.tint);
  const [phase, setPhase] = useState<Phase>("intro");
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(VISUAL_LIVES);
  const [pattern, setPattern] = useState<Set<number>>(new Set());
  const [found, setFound] = useState<Set<number>>(new Set());
  const [misses, setMisses] = useState<Set<number>>(new Set());
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const round = useCallback((lvl: number, delay = 450) => {
    setPattern(visualPattern(lvl));
    setFound(new Set());
    setMisses(new Set());
    setPhase("between");
    timer.current = setTimeout(() => {
      setPhase("show");
      timer.current = setTimeout(() => setPhase("input"), 1100);
    }, delay);
  }, []);

  const start = useCallback(async () => {
    setOutcome(null);
    setLevel(1);
    setLives(VISUAL_LIVES);
    fx.start();
    await begin();
    round(1);
  }, [begin, fx, round]);

  const press = async (cell: number) => {
    if (phase !== "input" || found.has(cell) || misses.has(cell)) return;
    if (pattern.has(cell)) {
      const f = new Set(found).add(cell);
      setFound(f);
      fx.tile(f.size - 1);
      if (f.size === pattern.size) {
        const next = level + 1;
        setPhase("between");
        setTimeout(() => fx.level(), 120);
        setLevel(next);
        round(next, 700);
      }
      return;
    }
    const m = new Set(misses).add(cell);
    setMisses(m);
    if (m.size >= VISUAL_MISSES_PER_ROUND) {
      const l = lives - 1;
      setLives(l);
      fx.life();
      if (l <= 0) {
        setPhase("between");
        const o = await finish({ level: level - 1 });
        setOutcome(o);
        setPhase("result");
        fx.end(o);
      } else {
        round(level, 900);
      }
    } else {
      fx.miss();
    }
  };

  if (phase === "intro") {
    return (
      <Stage kind="visual" ref={stageRef}>
        <GameIntro kind="visual" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage kind="visual" ref={stageRef}>
        <ResultPanel kind="visual" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  const size = visualGridSize(level);
  return (
    <Stage kind="visual" ref={stageRef}>
      <Hud
        level={level}
        lives={{ left: lives, total: VISUAL_LIVES }}
        items={[{ label: "Misses", value: `${misses.size}/${VISUAL_MISSES_PER_ROUND}` }]}
      />
      <p className="sr-only" aria-live="polite">
        {phase === "show" ? "Memorise the lit squares." : phase === "input" ? "Select the squares that were lit." : ""}
      </p>
      <div
        className="mt-4 grid w-full max-w-[min(28rem,84vw)] gap-2 sm:gap-2.5"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: size * size }).map((_, cell) => {
          const state =
            (phase === "show" && pattern.has(cell)) || found.has(cell)
              ? "lit"
              : misses.has(cell)
                ? "wrong"
                : phase === "input"
                  ? "idle"
                  : "off";
          return (
            <button
              key={`${level}-${cell}`}
              type="button"
              disabled={phase !== "input"}
              aria-label={`Square ${cell + 1}`}
              aria-pressed={found.has(cell) || misses.has(cell)}
              onPointerDown={(e) => {
                e.preventDefault();
                void press(cell);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  void press(cell);
                }
              }}
              className={`aspect-square w-full ${tileClass(state)}`}
            />
          );
        })}
      </div>
    </Stage>
  );
}
