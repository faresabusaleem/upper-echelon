"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VERBAL_LIVES, nextVerbalWord } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { WORDS } from "@/lib/games/words";
import { useArena } from "../fx";
import { GameIntro, Hud, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "playing" | "ending" | "result";
const T = GAME_THEMES.verbal;

export function VerbalGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("verbal", isMember);
  const { stageRef, fx } = useArena(T.tint);
  const [phase, setPhase] = useState<Phase>("intro");
  const [word, setWord] = useState<{ word: string; isSeen: boolean } | null>(null);
  const [turn, setTurn] = useState(0);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(VERBAL_LIVES);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const seen = useRef<string[]>([]);
  const busy = useRef(false);

  const draw = useCallback((last: string | null) => {
    const n = nextVerbalWord(WORDS, seen.current, last);
    if (!n.isSeen) seen.current.push(n.word);
    setWord(n);
    setTurn((t) => t + 1);
  }, []);

  const start = useCallback(async () => {
    seen.current = [];
    setScore(0);
    setLives(VERBAL_LIVES);
    setOutcome(null);
    fx.start();
    await begin();
    setPhase("playing");
    draw(null);
  }, [begin, draw, fx]);

  const answer = useCallback(
    async (saysSeen: boolean) => {
      if (phase !== "playing" || !word || busy.current) return;
      busy.current = true;
      const right = saysSeen === word.isSeen;
      const nextScore = right ? score + 1 : score;
      const nextLives = right ? lives : lives - 1;
      setScore(nextScore);
      setLives(nextLives);
      if (right) {
        // Every tenth word is a small milestone.
        if (nextScore % 10 === 0) fx.level();
        else fx.hit();
      } else {
        fx.life();
      }
      if (nextLives <= 0) {
        setPhase("ending");
        const o = await finish({ score: nextScore });
        setOutcome(o);
        setPhase("result");
        fx.end(o);
      } else {
        draw(word.word);
      }
      busy.current = false;
    },
    [draw, finish, fx, lives, phase, score, word],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "s" || e.key === "S" || e.key === "ArrowLeft") void answer(true);
      if (e.key === "n" || e.key === "N" || e.key === "ArrowRight") void answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, phase]);

  if (phase === "intro") {
    return (
      <Stage kind="verbal" ref={stageRef}>
        <GameIntro kind="verbal" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage kind="verbal" ref={stageRef}>
        <ResultPanel kind="verbal" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  return (
    <Stage kind="verbal" ref={stageRef}>
      <Hud level={score} levelLabel="Score" lives={{ left: lives, total: VERBAL_LIVES }} />
      <p
        key={turn}
        className="font-display text-[clamp(3rem,10vw,6.5rem)] leading-none motion-safe:animate-[rise-in_.28s_ease-out_both]"
        aria-live="polite"
      >
        {word?.word}
      </p>
      <div className="mt-14 grid w-full max-w-md grid-cols-2 gap-3">
        <button
          type="button"
          onClick={() => void answer(true)}
          disabled={phase !== "playing"}
          className="inline-flex h-16 flex-col items-center justify-center rounded-2xl bg-white/10 text-[1.1rem] font-semibold text-white ring-1 ring-white/15 transition-[transform,background-color] hover:bg-white/15 active:scale-[0.96]"
        >
          Seen
          <span className="text-micro font-normal text-white/50">S or ←</span>
        </button>
        <button
          type="button"
          onClick={() => void answer(false)}
          disabled={phase !== "playing"}
          className="inline-flex h-16 flex-col items-center justify-center rounded-2xl text-[1.1rem] font-semibold transition-[transform,filter] hover:brightness-110 active:scale-[0.96]"
          style={{ background: T.tint, color: T.stage, boxShadow: `0 10px 26px -10px ${T.glow}` }}
        >
          New
          <span className="text-micro font-normal opacity-60">N or →</span>
        </button>
      </div>
    </Stage>
  );
}
