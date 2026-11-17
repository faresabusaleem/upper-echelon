"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { PASSAGES } from "@/lib/games/passages";
import { typingCorrect, typingStats } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { cn } from "@/lib/utils";
import { useArena } from "../fx";
import { GameIntro, Hud, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "typing" | "result";

export function TypingGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("typing", isMember);
  const { stageRef, fx } = useArena(GAME_THEMES.typing.tint);
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
    fx.start();
    await begin();
    setPhase("typing");
  }, [begin, fx]);

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
      const o = await finish({
        passageId: passage.id,
        typed: Math.min(typedCount, passage.text.length + 20),
        correct: Math.min(correct, typedCount),
        durationMs,
      });
      setOutcome(o);
      setPhase("result");
      fx.end(o);
    },
    [finish, fx, passage],
  );

  const onChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const value = e.target.value.replace(/\n/g, " ").slice(0, passage.text.length);
    let t0 = startedAt;
    if (t0 == null && value.length > 0) {
      t0 = performance.now();
      setStartedAt(t0);
    }
    const added = Math.max(0, value.length - typed.length);
    // A soft thud when a new character is wrong; silence while it is right.
    if (added > 0 && value[value.length - 1] !== passage.text[value.length - 1]) fx.tap();
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
      <Stage kind="typing" ref={stageRef}>
        <GameIntro kind="typing" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    const acc = outcome.details.accuracy as number | undefined;
    return (
      <Stage kind="typing" ref={stageRef}>
        <ResultPanel
          kind="typing"
          outcome={outcome}
          onAgain={start}
          isMember={isMember}
          extra={
            acc != null && (
              <p className="text-small text-white/60">
                Gross {String(outcome.details.grossWpm)} wpm · accuracy {Math.round(acc * 100)}%
              </p>
            )
          }
        />
      </Stage>
    );
  }

  return (
    <Stage kind="typing" ref={stageRef} className="items-stretch" onClick={() => inputRef.current?.focus()}>
      <Hud level={live.wpm} levelLabel="Net wpm" items={[{ label: "Accuracy", value: `${live.acc}%` }]} />
      <p className="mx-auto mt-4 max-w-3xl font-display text-[clamp(1.4rem,2.6vw,2rem)] leading-[1.55]" aria-hidden>
        {passage.text.split("").map((ch, i) => {
          const state = i < typed.length ? (typed[i] === ch ? "ok" : "bad") : i === typed.length ? "caret" : "todo";
          return (
            <span
              key={i}
              className={cn(
                state === "ok" && "text-white",
                state === "bad" && "rounded-sm bg-[#c8573f]/30 text-[#ffb7a3] underline",
                state === "todo" && "text-white/35",
                state === "caret" && "rounded-sm bg-[var(--tint)] text-[var(--stage)] motion-safe:animate-pulse",
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
        <button
          type="button"
          onClick={start}
          className="inline-flex h-10 items-center rounded-xl bg-white/10 px-4 text-small font-medium text-white hover:bg-white/15"
        >
          New passage
        </button>
      </div>
    </Stage>
  );
}
