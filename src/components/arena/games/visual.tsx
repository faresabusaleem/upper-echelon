"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VISUAL_LIVES, VISUAL_MISSES_PER_ROUND, VISUAL_TIMING as T, visualGridSize, visualPattern } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { cn } from "@/lib/utils";
import { useArena } from "../fx";
import { GameIntro, Hud, Stage } from "../game-ui";
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

type Face = "down" | "up" | "found" | "wrong" | "missed";

/** A tile that turns over in 3D: face down is plain, face up is the trial's colour (or ember for a miss). */
function FlipTile({
  face,
  index,
  entering,
  winning,
  disabled,
  onPress,
}: {
  face: Face;
  index: number;
  entering: boolean;
  winning: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const up = face !== "down";
  return (
    <button
      type="button"
      disabled={disabled}
      aria-label={`Square ${index + 1}`}
      aria-pressed={face === "found" || face === "wrong"}
      onPointerDown={(e) => {
        e.preventDefault();
        onPress();
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onPress();
        }
      }}
      className={cn(
        "group relative aspect-square w-full touch-manipulation outline-offset-2 [perspective:700px] disabled:cursor-default",
        "transition-transform duration-100 ease-out active:scale-[0.9]",
        entering && "motion-safe:animate-[tile-in_.32s_cubic-bezier(.2,.9,.3,1.25)_both]",
        winning && "motion-safe:animate-[tile-win_.5s_ease-out_both]",
      )}
      style={{ animationDelay: entering ? `${Math.min(index * 14, 160)}ms` : winning ? `${(index % 7) * 25}ms` : undefined }}
    >
      <span
        className="absolute inset-0 transition-transform ease-[cubic-bezier(.3,.7,.3,1)] [transform-style:preserve-3d]"
        style={{ transform: up ? "rotateY(180deg)" : "rotateY(0deg)", transitionDuration: `${T.flip}ms` }}
      >
        {/* Face down */}
        <span className="absolute inset-0 rounded-[14px] bg-white/[0.09] ring-1 ring-inset ring-white/[0.05] [backface-visibility:hidden] group-enabled:group-hover:bg-white/[0.15]" />
        {/* Face up */}
        <span
          className="absolute inset-0 rounded-[14px] [backface-visibility:hidden] [transform:rotateY(180deg)]"
          style={
            face === "wrong"
              ? { background: "#c8573f", boxShadow: "0 0 22px rgba(200,87,63,0.55)" }
              : face === "missed"
                ? { background: `${THEME.tint}55`, boxShadow: `inset 0 0 0 2px ${THEME.tint}` }
                : { background: THEME.tint, boxShadow: `0 0 26px ${THEME.glow}` }
          }
        />
      </span>
    </button>
  );
}

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
  const faceOf = (cell: number): Face => {
    if (misses.has(cell)) return "wrong";
    if (found.has(cell)) return "found";
    if (phase === "show" && pattern.has(cell)) return "up";
    if ((phase === "lost" || phase === "ending") && pattern.has(cell)) return "missed";
    return "down";
  };
  return (
    <Stage kind="visual" ref={stageRef}>
      <Hud
        level={level}
        lives={{ left: lives, total: VISUAL_LIVES }}
        items={[{ label: "Misses", value: `${misses.size}/${VISUAL_MISSES_PER_ROUND}` }]}
      />
      <p className="mb-4 mt-2 h-5 text-center text-small text-white/55" aria-live="polite">
        {phase === "show" ? "Remember." : phase === "input" ? "Turn them over." : phase === "lost" ? "A flame goes out." : phase === "clear" ? "Rite complete." : ""}
      </p>
      <div
        key={`${round}-${size}`}
        className="grid w-full max-w-[min(28rem,84vw)] gap-2 sm:gap-2.5"
        style={{ gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: size * size }).map((_, cell) => (
          <FlipTile
            key={cell}
            index={cell}
            face={faceOf(cell)}
            entering={phase === "enter"}
            winning={phase === "clear" && found.has(cell)}
            disabled={phase !== "input"}
            onPress={() => void press(cell)}
          />
        ))}
      </div>
    </Stage>
  );
}
