"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { numberDisplayMs, randomDigits } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { useArena } from "../fx";
import { GameIntro, Hud, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "show" | "recall" | "correct" | "wrong" | "result";
const T = GAME_THEMES.number;

function Primary({ children, ...props }: React.ComponentProps<"button">) {
  return (
    <button
      {...props}
      className="inline-flex h-13 items-center gap-2 rounded-2xl px-8 font-semibold transition-[transform,filter] hover:-translate-y-0.5 hover:brightness-110 active:scale-[0.97] disabled:opacity-50"
      style={{ background: T.tint, color: T.stage, boxShadow: `0 12px 30px -10px ${T.glow}` }}
    >
      {children}
    </button>
  );
}

export function NumberGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("number", isMember);
  const { stageRef, fx } = useArena(T.tint);
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
    fx.start();
    await begin();
    show(1);
  }, [begin, fx, show]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (phase !== "recall") return;
    if (answer.trim() === value) {
      setPhase("correct");
      fx.level();
    } else {
      setPhase("wrong");
      fx.life();
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
      <Stage kind="number" ref={stageRef}>
        <GameIntro kind="number" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage kind="number" ref={stageRef}>
        <ResultPanel kind="number" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  return (
    <Stage kind="number" ref={stageRef}>
      <Hud level={length} levelLabel="Digits" lives={{ left: phase === "wrong" ? 0 : 1, total: 1 }} />
      {phase === "show" && (
        <div className="flex w-full max-w-3xl flex-col items-center gap-8">
          <p className="figure break-all text-center text-[clamp(2.5rem,9vw,6rem)] leading-none tracking-[0.04em]" aria-live="polite">
            {value}
          </p>
          <div className="h-2 w-full max-w-sm overflow-hidden rounded-full bg-white/10" aria-hidden>
            <div className="h-full rounded-full" style={{ width: `${progress * 100}%`, background: T.tint, boxShadow: `0 0 14px ${T.glow}` }} />
          </div>
        </div>
      )}
      {phase === "recall" && (
        <form onSubmit={submit} className="flex w-full max-w-md flex-col items-center gap-6">
          <label htmlFor="recall" className="font-display text-[clamp(1.8rem,4vw,2.4rem)]">
            What was the number?
          </label>
          <input
            id="recall"
            ref={inputRef}
            value={answer}
            onChange={(e) => setAnswer(e.target.value.replace(/\D/g, ""))}
            inputMode="numeric"
            autoComplete="off"
            className="figure h-16 w-full rounded-2xl bg-black/30 px-4 text-center text-3xl tracking-[0.06em] text-white outline-none ring-1 ring-white/15 focus:ring-2 focus:ring-[var(--tint)]"
          />
          <Primary type="submit" disabled={!answer}>
            Submit <kbd className="rounded-md bg-black/15 px-1.5 py-0.5 font-sans text-micro">Enter</kbd>
          </Primary>
        </form>
      )}
      {phase === "correct" && (
        <div className="flex flex-col items-center gap-5 text-center motion-safe:animate-[rise-in_.35s_ease-out_both]" aria-live="polite">
          <p className="font-display text-[clamp(2.4rem,6vw,3.6rem)] leading-none">Correct.</p>
          <p className="figure break-all text-2xl text-white/60">{value}</p>
          <Primary onClick={next} autoFocus>
            Next: {length + 1} digits
          </Primary>
        </div>
      )}
      {phase === "wrong" && (
        <div className="flex w-full max-w-2xl flex-col items-center gap-3 text-center" aria-live="polite">
          <p className="text-small text-white/55">The number</p>
          <p className="figure break-all text-3xl">{value}</p>
          <p className="mt-2 text-small text-white/55">You wrote</p>
          <p className="figure break-all text-3xl">
            {(answer || "—").split("").map((d, i) => (
              <span key={i} className={d === value[i] ? "text-white" : "text-[#ff9a80] underline decoration-2 underline-offset-4"}>
                {d}
              </span>
            ))}
          </p>
          <div className="mt-5">
            <Primary
              onClick={() => {
                setPhase("result");
                if (outcome) fx.end(outcome);
              }}
              disabled={!outcome}
              autoFocus
            >
              {outcome ? "See the result" : "Weighing…"}
            </Primary>
          </div>
        </div>
      )}
    </Stage>
  );
}
