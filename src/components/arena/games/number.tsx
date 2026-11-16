"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { numberDisplayMs, randomDigits } from "@/lib/games/engine";
import { Button } from "@/components/ui/button";
import { GameIntro, Readout, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "show" | "recall" | "correct" | "wrong" | "result";

export function NumberGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("number", isMember);
  const [phase, setPhase] = useState<Phase>("intro");
  const [length, setLength] = useState(1);
  const [value, setValue] = useState("");
  const [answer, setAnswer] = useState("");
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const [progress, setProgress] = useState(1);
  const inputRef = useRef<HTMLInputElement>(null);

  const show = useCallback((len: number) => {
    setValue(randomDigits(len));
    setAnswer("");
    setPhase("show");
  }, []);

  useEffect(() => {
    if (phase !== "show") return;
    const total = numberDisplayMs(length);
    const t0 = performance.now();
    let raf = 0;
    const tick = () => {
      const p = 1 - (performance.now() - t0) / total;
      setProgress(Math.max(0, p));
      if (p <= 0) setPhase("recall");
      else raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [phase, length]);

  useEffect(() => {
    if (phase === "recall") inputRef.current?.focus();
  }, [phase]);

  const start = useCallback(async () => {
    setOutcome(null);
    setLength(1);
    await begin();
    show(1);
  }, [begin, show]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase !== "recall") return;
    if (answer.trim() === value) {
      setPhase("correct");
    } else {
      setPhase("wrong");
      setOutcome(await finish({ digits: length - 1 }));
    }
  };

  const next = () => {
    const len = length + 1;
    setLength(len);
    show(len);
  };

  if (phase === "intro") {
    return (
      <Stage className="items-start sm:px-14">
        <GameIntro kind="number" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage className="items-start sm:px-14">
        <ResultPanel kind="number" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  return (
    <Stage tone="deep">
      <Readout items={[{ label: "Digits", value: length }]} />
      {phase === "show" && (
        <div className="flex w-full max-w-3xl flex-col items-center gap-8">
          <p className="figure break-all text-center text-[clamp(2.5rem,9vw,6rem)] leading-none text-ink" aria-live="polite">
            {value}
          </p>
          <div className="h-1 w-full max-w-sm bg-panel-3" aria-hidden>
            <div className="h-full bg-gold" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}
      {phase === "recall" && (
        <form onSubmit={submit} className="flex w-full max-w-md flex-col items-center gap-6">
          <label htmlFor="recall" className="font-display text-display-s text-ink">
            What was the number?
          </label>
          <input
            id="recall"
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            autoComplete="off"
            className="figure h-16 w-full bg-panel px-4 text-center text-3xl text-ink outline-none focus-visible:outline-2 focus-visible:outline-gold"
          />
          <Button type="submit" disabled={!answer}>
            Submit
          </Button>
        </form>
      )}
      {phase === "correct" && (
        <div className="flex flex-col items-center gap-6 text-center" aria-live="polite">
          <p className="font-display text-display-m text-ink">Correct.</p>
          <p className="figure text-2xl text-muted">{value}</p>
          <Button onClick={next} autoFocus>
            Next: {length + 1} digits
          </Button>
        </div>
      )}
      {phase === "wrong" && (
        <div className="flex w-full max-w-2xl flex-col items-center gap-4 text-center" aria-live="polite">
          <p className="text-muted">The number</p>
          <p className="figure break-all text-3xl text-ink">{value}</p>
          <p className="mt-2 text-muted">You wrote</p>
          <p className="figure break-all text-3xl text-danger">{answer || "—"}</p>
          <Button className="mt-6" onClick={() => setPhase("result")} disabled={!outcome} autoFocus>
            {outcome ? "See the result" : "Weighing…"}
          </Button>
        </div>
      )}
    </Stage>
  );
}
