"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VISUAL_LIVES, VISUAL_MISSES_PER_ROUND, VISUAL_TIMING as T, visualGridSize, visualPattern } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { useArena } from "../fx";
import { FlipTile, GameIntro, Hud, Prompt, Stage, type TileBack } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

/**
 * Phases of a round:
 *   enter → the board settles in (T.enter)
 *   show  → the pattern turns face up and stays (T.flip + T.show)
 *   hide  → the pattern turns face down (T.flip), then input
 *   input → the player turns tiles over
 *   clear → every tile found: the board glows and clears (T.clear), then the next level enters
 *   lost  → three misses: the missed tiles are shown (T.retry), then the level is replayed
 */
type Phase = "intro" | "enter" | "show" | "hide" | "input" | "clear" | "lost" | "ending" | "result";
const THEME = GAME_THEMES.visual;

export function VisualGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("visual", isMember);
  const { stageRef, fx } = useArena(THEME.tint);
  const [phase, setPhase] = useState<Phase>("intro");
  const [level, setLevel] = useState(1);
  const [lives, setLives] = useState(VISUAL_LIVES);
  const [pattern, setPattern] = useState<Set<number>>(new Set());
  const [found, setFound] = useState<Set<number>>(new Set());
  const [misses, setMisses] = useState<Set<number>>(new Set());
  const [round, setRound] = useState(0);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const timers = useRef<Array<ReturnType<typeof setTimeout>>>([]);

  const later = useCallback((ms: number, fn: () => void) => {
    timers.current.push(setTimeout(fn, ms));
  }, []);
  const clearTimers = useCallback(() => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  }, []);
  useEffect(() => clearTimers, [clearTimers]);

  /** Deal a level: enter, show, hide, then hand over to the player. */
  const deal = useCallback(
    (lvl: number) => {
      setPattern(visualPattern(lvl));
      setFound(new Set());
      setMisses(new Set());
      setRound((r) => r + 1);
      setPhase("enter");
      later(T.enter, () => setPhase("show"));
      later(T.enter + T.flip + T.show, () => setPhase("hide"));
      later(T.enter + T.flip + T.show + T.flip, () => setPhase("input"));
    },
    [later],
  );

  const start = useCallback(async () => {
    clearTimers();
    setOutcome(null);
    setLevel(1);
    setLives(VISUAL_LIVES);
    fx.start();
    await begin();
    deal(1);
  }, [begin, clearTimers, deal, fx]);

  const press = async (cell: number) => {
    if (phase !== "input" || found.has(cell) || misses.has(cell)) return;
    if (pattern.has(cell)) {
      const f = new Set(found).add(cell);
      setFound(f);
      if (f.size === pattern.size) {
        setPhase("clear");
        fx.level();
        const next = level + 1;
        later(T.clear, () => {
          setLevel(next);
          deal(next);
        });
      } else {
        fx.tile(f.size - 1);
      }
      return;
    }
    const m = new Set(misses).add(cell);
    setMisses(m);
    if (m.size < VISUAL_MISSES_PER_ROUND) {
      fx.miss();
      return;
    }
    const left = lives - 1;
    setLives(left);
    fx.life();
    setPhase("lost");
    if (left <= 0) {
      later(T.retry, async () => {
        setPhase("ending");
        const o = await finish({ level: level - 1 });
        setOutcome(o);
        setPhase("result");
        fx.end(o);
      });
    } else {
      later(T.retry, () => deal(level));
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
  const faceOf = (cell: number): { up: boolean; back: TileBack } => {
    if (misses.has(cell)) return { up: true, back: "wrong" };
    if (found.has(cell)) return { up: true, back: "lit" };
    if (phase === "show" && pattern.has(cell)) return { up: true, back: "lit" };
    if ((phase === "lost" || phase === "ending") && pattern.has(cell)) return { up: true, back: "missed" };
    return { up: false, back: "lit" };
  };
  return (
    <Stage kind="visual" ref={stageRef}>
      <Hud level={level} lives={{ left: lives, total: VISUAL_LIVES }} items={[{ label: "Misses", value: `${misses.size}/${VISUAL_MISSES_PER_ROUND}` }]} />
      <Prompt>
        {phase === "show"
          ? "Remember."
          : phase === "input"
            ? "Turn them over."
            : phase === "lost"
              ? "A flame goes out."
              : phase === "clear"
                ? "Level complete."
                : ""}
      </Prompt>
      <div
        key={`${round}-${size}`}
        className="grid w-full max-w-[min(28rem,84vw)] gap-2 sm:gap-2.5"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: size * size }).map((_, cell) => {
          const f = faceOf(cell);
          return (
            <FlipTile
              key={cell}
              index={cell}
              label={`Square ${cell + 1}`}
              up={f.up}
              back={f.back}
              flipMs={T.flip}
              entering={phase === "enter"}
              winning={phase === "clear" && found.has(cell)}
              disabled={phase !== "input"}
              onPress={() => void press(cell)}
            />
          );
        })}
      </div>
    </Stage>
  );
}
