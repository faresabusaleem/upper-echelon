"use client";

import { useCallback, useEffect, useState } from "react";
import { CHIMP_COLS, CHIMP_MAX, CHIMP_ROWS, CHIMP_START, CHIMP_STRIKES, TILE_FLIP_MS, chimpLayout } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { useArena } from "../fx";
import { FlipTile, GameIntro, Hud, Prompt, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

/**
 * Phases: enter (the numbers settle in) → playing (after the first tile, the rest turn over to hide
 * their numbers; correct tiles vanish) → reveal (a wrong tile turns ember and the remaining numbers
 * turn back up, so the order can be seen) → between (continue) → the next deal.
 */
type Phase = "intro" | "enter" | "playing" | "reveal" | "between" | "ending" | "result";
const T = GAME_THEMES.chimp;
const ENTER_MS = 420;
const REVEAL_MS = 1300;

export function ChimpGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("chimp", isMember);
  const { stageRef, fx } = useArena(T.tint);
  const [phase, setPhase] = useState<Phase>("intro");
  const [count, setCount] = useState(CHIMP_START);
  const [cells, setCells] = useState<number[]>([]);
  const [nextNo, setNextNo] = useState(1);
  const [strikes, setStrikes] = useState(0);
  const [best, setBest] = useState(0);
  const [wrongCell, setWrongCell] = useState<number | null>(null);
  const [verdict, setVerdict] = useState<"pass" | "strike" | null>(null);
  const [deals, setDeals] = useState(0);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);

  const deal = useCallback((n: number) => {
    setCells(chimpLayout(n));
    setNextNo(1);
    setVerdict(null);
    setWrongCell(null);
    setDeals((d) => d + 1);
    setPhase("enter");
    setTimeout(() => setPhase((p) => (p === "enter" ? "playing" : p)), ENTER_MS);
  }, []);

  const start = useCallback(async () => {
    setOutcome(null);
    setStrikes(0);
    setBest(0);
    setCount(CHIMP_START);
    fx.start();
    await begin();
    deal(CHIMP_START);
  }, [begin, deal, fx]);

  const end = useCallback(
    async (numbers: number) => {
      setPhase("ending");
      const o = await finish({ numbers });
      setOutcome(o);
      setPhase("result");
      fx.end(o);
    },
    [finish, fx],
  );

  const press = (cell: number) => {
    if (phase !== "playing" && phase !== "enter") return;
    const number = cells.indexOf(cell) + 1;
    if (number < nextNo) return; // already cleared
    if (number === nextNo) {
      fx.tile(number - 1);
      if (phase === "enter") setPhase("playing");
      if (number === cells.length) {
        setNextNo(number + 1);
        setBest(count);
        setVerdict("pass");
        fx.level();
        setTimeout(() => setPhase("between"), 380);
      } else {
        setNextNo(number + 1);
      }
      return;
    }
    const s = strikes + 1;
    setStrikes(s);
    setVerdict("strike");
    setWrongCell(cell);
    setPhase("reveal");
    fx.life();
    setTimeout(() => {
      if (s >= CHIMP_STRIKES) void end(best);
      else setPhase("between");
    }, REVEAL_MS);
  };

  const proceed = useCallback(async () => {
    if (verdict === "pass") {
      if (count >= CHIMP_MAX) {
        await end(best);
        return;
      }
      const n = Math.min(count + 1, CHIMP_MAX);
      setCount(n);
      deal(n);
    } else {
      deal(count);
    }
  }, [best, count, deal, end, verdict]);

  // Space or Enter continues between rounds.
  useEffect(() => {
    if (phase !== "between") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        void proceed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, proceed]);

  if (phase === "intro") {
    return (
      <Stage kind="chimp" ref={stageRef}>
        <GameIntro kind="chimp" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage kind="chimp" ref={stageRef}>
        <ResultPanel kind="chimp" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  const hidden = nextNo > 1 && phase !== "reveal";
  return (
    <Stage kind="chimp" ref={stageRef} className="px-3 sm:px-8">
      <Hud level={count - CHIMP_START + 1} items={[{ label: "Numbers", value: count }]} lives={{ left: CHIMP_STRIKES - strikes, total: CHIMP_STRIKES }} />
      {phase === "between" && verdict ? (
        <div className="flex flex-col items-center gap-5 text-center motion-safe:animate-[rise-in_.4s_ease-out_both]" aria-live="polite">
          <p className="font-display text-[clamp(2.4rem,6vw,3.6rem)] leading-none">{verdict === "pass" ? "Level complete." : "A flame goes out."}</p>
          <p className="text-white/70">
            {verdict === "pass" ? `Next: ${Math.min(count + 1, CHIMP_MAX)} numbers.` : `${CHIMP_STRIKES - strikes} left. Same count again.`}
          </p>
          <button
            type="button"
            onClick={() => void proceed()}
            autoFocus
            className="inline-flex h-13 items-center gap-2 rounded-2xl px-8 font-semibold transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97]"
            style={{ background: T.tint, color: T.stage }}
          >
            Continue <kbd className="rounded-md bg-black/15 px-1.5 py-0.5 font-sans text-micro">Space</kbd>
          </button>
        </div>
      ) : (
        <>
          <Prompt>
            {phase === "reveal"
              ? strikes >= CHIMP_STRIKES
                ? "The last flame goes out."
                : "A flame goes out. This was the order."
              : nextNo === 1
                ? "Remember the order, then start with 1."
                : verdict === "pass"
                  ? "Level complete."
                  : "In order."}
          </Prompt>
          <div
            key={deals}
            className="grid w-full max-w-4xl gap-2 sm:gap-2.5"
            style={{ gridTemplateColumns: `repeat(${CHIMP_COLS}, minmax(0, 1fr))` }}
            aria-label={`Field of ${CHIMP_COLS} by ${CHIMP_ROWS}`}
          >
            {Array.from({ length: CHIMP_MAX }).map((_, cell) => {
              const idx = cells.indexOf(cell);
              const number = idx + 1;
              if (idx === -1) return <span key={cell} className="aspect-square" aria-hidden />;
              const cleared = number < nextNo && cell !== wrongCell;
              return (
                <FlipTile
                  key={cell}
                  index={idx}
                  label={hidden ? "Hidden number" : `Number ${number}`}
                  gone={cleared}
                  up={cell === wrongCell || hidden}
                  back={cell === wrongCell ? "wrong" : "hidden"}
                  flipMs={TILE_FLIP_MS}
                  front={<span className="figure text-[clamp(1rem,3.2vw,2rem)] font-semibold">{number}</span>}
                  frontClassName="border-2 border-white/70 bg-white/[0.06] text-white group-enabled:group-hover:bg-white/[0.14]"
                  entering={phase === "enter"}
                  disabled={phase !== "playing" && phase !== "enter"}
                  onPress={() => press(cell)}
                />
              );
            })}
          </div>
        </>
      )}
    </Stage>
  );
}
