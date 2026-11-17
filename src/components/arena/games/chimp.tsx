"use client";

import { useCallback, useEffect, useState } from "react";
import { CHIMP_COLS, CHIMP_MAX, CHIMP_ROWS, CHIMP_START, CHIMP_STRIKES, chimpLayout } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { cn } from "@/lib/utils";
import { useArena } from "../fx";
import { GameIntro, Hud, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "playing" | "between" | "result";
const T = GAME_THEMES.chimp;

export function ChimpGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("chimp", isMember);
  const { stageRef, fx } = useArena(T.tint);
  const [phase, setPhase] = useState<Phase>("intro");
  const [count, setCount] = useState(CHIMP_START);
  const [cells, setCells] = useState<number[]>([]);
  const [nextNo, setNextNo] = useState(1);
  const [strikes, setStrikes] = useState(0);
  const [best, setBest] = useState(0);
  const [verdict, setVerdict] = useState<"pass" | "strike" | null>(null);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);

  const deal = useCallback((n: number) => {
    setCells(chimpLayout(n));
    setNextNo(1);
    setVerdict(null);
    setPhase("playing");
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
      const o = await finish({ numbers });
      setOutcome(o);
      setPhase("result");
      fx.end(o);
    },
    [finish, fx],
  );

  const press = async (cell: number) => {
    if (phase !== "playing") return;
    const number = cells.indexOf(cell) + 1;
    if (number < nextNo) return; // already cleared
    if (number === nextNo) {
      fx.tile(number - 1);
      if (number === cells.length) {
        setBest(count);
        setVerdict("pass");
        setPhase("between");
        fx.level();
      } else {
        setNextNo(number + 1);
      }
      return;
    }
    const s = strikes + 1;
    setStrikes(s);
    setVerdict("strike");
    fx.life();
    if (s >= CHIMP_STRIKES) {
      setPhase("between");
      await end(best);
    } else {
      setPhase("between");
    }
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
    if (phase !== "between" || !verdict || (verdict === "strike" && strikes >= CHIMP_STRIKES)) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === " " || e.key === "Enter") {
        e.preventDefault();
        void proceed();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, proceed, strikes, verdict]);

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

  const hidden = nextNo > 1;
  return (
    <Stage kind="chimp" ref={stageRef} className="px-3 sm:px-8">
      <Hud level={count} levelLabel="Numbers" lives={{ left: CHIMP_STRIKES - strikes, total: CHIMP_STRIKES }} />
      {phase === "between" && verdict ? (
        <div className="flex flex-col items-center gap-5 text-center motion-safe:animate-[rise-in_.4s_ease-out_both]" aria-live="polite">
          <p className="font-display text-[clamp(2.4rem,6vw,3.6rem)] leading-none">{verdict === "pass" ? "Correct." : "A flame goes out."}</p>
          <p className="text-white/70">
            {verdict === "pass"
              ? `Next: ${Math.min(count + 1, CHIMP_MAX)} numbers.`
              : strikes >= CHIMP_STRIKES
                ? "Weighing the result…"
                : `${CHIMP_STRIKES - strikes} left. Same count again.`}
          </p>
          {!(verdict === "strike" && strikes >= CHIMP_STRIKES) && (
            <button
              type="button"
              onClick={() => void proceed()}
              autoFocus
              className="inline-flex h-13 items-center gap-2 rounded-2xl px-8 font-semibold transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97]"
              style={{ background: T.tint, color: T.stage }}
            >
              Continue <kbd className="rounded-md bg-black/15 px-1.5 py-0.5 font-sans text-micro">Space</kbd>
            </button>
          )}
        </div>
      ) : (
        <div
          className="mt-6 grid w-full max-w-4xl gap-2 sm:gap-2.5"
          style={{ gridTemplateColumns: `repeat(${CHIMP_COLS}, minmax(0, 1fr))` }}
          aria-label={`Field of ${CHIMP_COLS} by ${CHIMP_ROWS}`}
        >
          {Array.from({ length: CHIMP_MAX }).map((_, cell) => {
            const idx = cells.indexOf(cell);
            const number = idx + 1;
            if (idx === -1 || number < nextNo) return <span key={cell} className="aspect-square" aria-hidden />;
            return (
              <button
                key={cell}
                type="button"
                aria-label={hidden ? "Hidden number" : `Number ${number}`}
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
                  "figure flex aspect-square items-center justify-center rounded-[12px] border-2 text-[clamp(1rem,3.2vw,2rem)] font-semibold transition-[transform,background-color] duration-100 active:scale-90",
                  hidden
                    ? "border-transparent bg-[var(--tint)] text-transparent shadow-[0_0_18px_var(--glow)] hover:brightness-110"
                    : "border-white/70 bg-white/[0.06] text-white hover:bg-white/[0.14]",
                )}
              >
                {hidden ? "" : number}
              </button>
            );
          })}
        </div>
      )}
    </Stage>
  );
}
