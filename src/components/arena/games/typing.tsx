"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PASSAGES } from "@/lib/games/passages";
import { typingCorrect, typingStats } from "@/lib/games/engine";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { GameIntro, Readout, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "typing" | "result";

export function TypingGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("typing", isMember);
  const [phase, setPhase] = useState<Phase>("intro");
  const [passageIndex, setPassageIndex] = useState(0);
  const [typed, setTyped] = useState("");
  const [startedAt, setStartedAt] = useState<number | null>(null);
  const [now, setNow] = useState(0);
  const [keystrokes, setKeystrokes] = useState(0);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const passage = PASSAGES[passageIndex];

  const start = useCallback(async () => {
    setPassageIndex(Math.floor(Math.random() * PASSAGES.length));
    setTyped("");
    setStartedAt(null);
    setKeystrokes(0);
    setOutcome(null);
    await begin();
    setPhase("typing");
  }, [begin]);

  useEffect(() => {
    if (phase === "typing") inputRef.current?.focus();
  }, [phase]);

  useEffect(() => {
    if (phase !== "typing" || startedAt == null) return;
    const id = setInterval(() => setNow(performance.now()), 200);
    return () => clearInterval(id);
  }, [phase, startedAt]);

  const done = useCallback(
    async (text: string, t0: number, strokes: number) => {
      const durationMs = Math.max(1, Math.round(performance.now() - t0));
      // Accuracy counts every character typed, including ones later corrected.
      const correct = typingCorrect(passage.text, text);
      const typedCount = Math.max(text.length, strokes);
      setPhase("result");
      setOutcome(
        await finish({
          passageId: passage.id,
          typed: Math.min(typedCount, passage.text.length + 20),
          correct: Math.min(correct, typedCount),
          durationMs,
        }),
      );
    },
    [finish, passage],
  );

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.replace(/\n/g, " ").slice(0, passage.text.length);
    let t0 = startedAt;
    if (t0 == null && value.length > 0) {
      t0 = performance.now();
      setStartedAt(t0);
    }
    const added = Math.max(0, value.length - typed.length);
    const strokes = keystrokes + added;
    setKeystrokes(strokes);
    setTyped(value);
    if (value.length >= passage.text.length && t0 != null) void done(value, t0, strokes);
  };

  const live = useMemo(() => {
    if (startedAt == null) return { wpm: 0, acc: 100 };
    const s = typingStats(Math.max(typed.length, 1), typingCorrect(passage.text, typed), Math.max(1, now - startedAt));
    return { wpm: Math.round(s.netWpm), acc: Math.round(s.accuracy * 100) };
  }, [now, passage.text, startedAt, typed]);

  if (phase === "intro") {
    return (
      <Stage className="items-start sm:px-14">
        <GameIntro kind="typing" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    const acc = outcome.details.accuracy as number | undefined;
    return (
      <Stage className="items-start sm:px-14">
        <ResultPanel
          kind="typing"
          outcome={outcome}
          onAgain={start}
          isMember={isMember}
          extra={
            acc != null && (
              <p className="text-small text-muted">
                Gross {String(outcome.details.grossWpm)} wpm · accuracy {Math.round(acc * 100)}%
              </p>
            )
          }
        />
      </Stage>
    );
  }

  return (
    <Stage tone="deep" className="items-stretch sm:px-14" onClick={() => inputRef.current?.focus()}>
      <Readout
        items={[
          { label: "Net wpm", value: live.wpm },
          { label: "Accuracy", value: `${live.acc}%` },
        ]}
      />
      <p className="mx-auto mt-10 max-w-3xl font-display text-[clamp(1.4rem,2.6vw,2rem)] leading-[1.55]" aria-hidden>
        {passage.text.split("").map((ch, i) => {
          const state = i < typed.length ? (typed[i] === ch ? "ok" : "bad") : i === typed.length ? "caret" : "todo";
          return (
            <span
              key={i}
              className={cn(
                state === "ok" && "text-ink",
                state === "bad" && "bg-danger-wash text-danger underline",
                state === "todo" && "text-faint",
                state === "caret" && "bg-gold text-ground",
              )}
            >
              {ch}
            </span>
          );
        })}
      </p>
      <label htmlFor="typing-input" className="sr-only">
        Type the passage: {passage.text}
      </label>
      <textarea
        id="typing-input"
        ref={inputRef}
        value={typed}
        onChange={onChange}
        onPaste={(e) => e.preventDefault()}
        onDrop={(e) => e.preventDefault()}
        autoCapitalize="off"
        autoComplete="off"
        autoCorrect="off"
        spellCheck={false}
        className="absolute h-px w-px opacity-0"
      />
      <div className="mx-auto mt-10 flex gap-3">
        <Button variant="secondary" size="sm" onClick={start}>
          New passage
        </Button>
      </div>
    </Stage>
  );
}
