"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VISUAL_LIVES, VISUAL_MISSES_PER_ROUND, visualGridSize, visualPattern } from "@/lib/games/engine";
import { cn } from "@/lib/utils";
import { GameIntro, Lives, Readout, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "show" | "input" | "between" | "result";

export function VisualGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("visual", isMember);
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

  const round = useCallback((lvl: number) => {
    setPattern(visualPattern(lvl));
    setFound(new Set());
    setMisses(new Set());
    setPhase("between");
    timer.current = setTimeout(() => {
      setPhase("show");
      timer.current = setTimeout(() => setPhase("input"), 1100);
    }, 450);
  }, []);

  const start = useCallback(async () => {
    setOutcome(null);
    setLevel(1);
    setLives(VISUAL_LIVES);
    await begin();
    round(1);
  }, [begin, round]);

  const press = async (cell: number) => {
    if (phase !== "input" || found.has(cell) || misses.has(cell)) return;
    if (pattern.has(cell)) {
      const f = new Set(found).add(cell);
      setFound(f);
      if (f.size === pattern.size) {
        const next = level + 1;
        setLevel(next);
        round(next);
      }
      return;
    }
    const m = new Set(misses).add(cell);
    setMisses(m);
    if (m.size >= VISUAL_MISSES_PER_ROUND) {
      const l = lives - 1;
      setLives(l);
      if (l <= 0) {
        setPhase("result");
        setOutcome(await finish({ level: level - 1 }));
      } else {
        round(level);
      }
    }
  };

  if (phase === "intro") {
    return (
      <Stage className="items-start sm:px-14">
        <GameIntro kind="visual" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage className="items-start sm:px-14">
        <ResultPanel kind="visual" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  const size = visualGridSize(level);
  return (
    <Stage tone="deep">
      <Readout items={[{ label: "Level", value: level }, { label: "Lives", value: <Lives left={lives} total={VISUAL_LIVES} /> }]} />
      <p className="sr-only" aria-live="polite">
        {phase === "show" ? "Memorise the lit squares." : phase === "input" ? "Select the squares that were lit." : ""}
      </p>
      <div
        className="mt-8 grid w-full max-w-[min(30rem,82vw)] gap-1.5 sm:gap-2"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: size * size }).map((_, cell) => {
          const lit = (phase === "show" && pattern.has(cell)) || found.has(cell);
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
              className={cn(
                "aspect-square w-full transition-colors duration-200 disabled:cursor-default",
                lit ? "bg-gold" : misses.has(cell) ? "bg-danger-wash" : "bg-panel-2 hover:bg-panel-3",
              )}
            />
          );
        })}
      </div>
    </Stage>
  );
}
