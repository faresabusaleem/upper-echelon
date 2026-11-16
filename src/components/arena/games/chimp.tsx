"use client";

import { useCallback, useState } from "react";
import { CHIMP_COLS, CHIMP_MAX, CHIMP_ROWS, CHIMP_START, CHIMP_STRIKES, chimpLayout } from "@/lib/games/engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GameIntro, Lives, Readout, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "playing" | "between" | "result";

export function ChimpGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("chimp", isMember);
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
    await begin();
    deal(CHIMP_START);
  }, [begin, deal]);

  const press = async (cell: number) => {
    if (phase !== "playing") return;
    const number = cells.indexOf(cell) + 1;
    if (number < nextNo) return; // already cleared
    if (number === nextNo) {
      if (number === cells.length) {
        setBest(count);
        setVerdict("pass");
        setPhase("between");
      } else {
        setNextNo(number + 1);
      }
      return;
    }
    const s = strikes + 1;
    setStrikes(s);
    setVerdict("strike");
    if (s >= CHIMP_STRIKES) {
      setPhase("result");
      setOutcome(await finish({ numbers: best }));
    } else {
      setPhase("between");
    }
  };

  const proceed = async () => {
    if (verdict === "pass") {
      const n = Math.min(count + 1, CHIMP_MAX);
      if (count >= CHIMP_MAX) {
        setPhase("result");
        setOutcome(await finish({ numbers: best }));
        return;
      }
      setCount(n);
      deal(n);
    } else {
      deal(count);
    }
  };

  if (phase === "intro") {
    return (
      <Stage className="items-start sm:px-14">
        <GameIntro kind="chimp" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage className="items-start sm:px-14">
        <ResultPanel kind="chimp" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  const hidden = nextNo > 1;
  return (
    <Stage tone="deep" className="px-3 sm:px-8">
      <Readout
        items={[
          { label: "Numbers", value: count },
          { label: "Strikes", value: <Lives left={CHIMP_STRIKES - strikes} total={CHIMP_STRIKES} /> },
        ]}
      />
      {phase === "between" ? (
        <div className="flex flex-col items-center gap-6 text-center" aria-live="polite">
          <p className="font-display text-display-m text-ink">{verdict === "pass" ? "Correct." : "A strike."}</p>
          <p className="text-ink-2">
            {verdict === "pass" ? `Next: ${Math.min(count + 1, CHIMP_MAX)} numbers.` : `${CHIMP_STRIKES - strikes} left. Same count again.`}
          </p>
          <Button onClick={proceed} autoFocus disabled={phase !== "between"}>
            Continue
          </Button>
        </div>
      ) : (
        <div
          className="mt-8 grid w-full max-w-4xl gap-1.5 sm:gap-2"
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
                  "figure flex aspect-square items-center justify-center text-[clamp(1rem,3.2vw,2rem)] transition-colors duration-100",
                  hidden ? "bg-ink-2 text-transparent hover:bg-ink" : "bg-panel-2 text-ink hover:bg-panel-3",
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
