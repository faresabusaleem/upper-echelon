"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { VERBAL_LIVES, nextVerbalWord } from "@/lib/games/engine";
import { WORDS } from "@/lib/games/words";
import { Button } from "@/components/ui/button";
import { GameIntro, Lives, Readout, Stage } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "playing" | "result";

export function VerbalGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("verbal", isMember);
  const [phase, setPhase] = useState<Phase>("intro");
  const [word, setWord] = useState<{ word: string; isSeen: boolean } | null>(null);
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(VERBAL_LIVES);
  const [flash, setFlash] = useState<"right" | "wrong" | null>(null);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const seen = useRef<string[]>([]);
  const busy = useRef(false);

  const draw = useCallback((last: string | null) => {
    const n = nextVerbalWord(WORDS, seen.current, last);
    if (!n.isSeen) seen.current.push(n.word);
    setWord(n);
  }, []);

  const start = useCallback(async () => {
    seen.current = [];
    setScore(0);
    setLives(VERBAL_LIVES);
    setOutcome(null);
    await begin();
    setPhase("playing");
    draw(null);
  }, [begin, draw]);

  const answer = useCallback(
    async (saysSeen: boolean) => {
      if (phase !== "playing" || !word || busy.current) return;
      busy.current = true;
      const right = saysSeen === word.isSeen;
      setFlash(right ? "right" : "wrong");
      setTimeout(() => setFlash(null), 160);
      const nextScore = right ? score + 1 : score;
      const nextLives = right ? lives : lives - 1;
      setScore(nextScore);
      setLives(nextLives);
      if (nextLives <= 0) {
        setPhase("result");
        setOutcome(await finish({ score: nextScore }));
      } else {
        draw(word.word);
      }
      busy.current = false;
    },
    [draw, finish, lives, phase, score, word],
  );

  useEffect(() => {
    if (phase !== "playing") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.repeat) return;
      if (e.key === "s" || e.key === "S") void answer(true);
      if (e.key === "n" || e.key === "N") void answer(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [answer, phase]);

  if (phase === "intro") {
    return (
      <Stage className="items-start sm:px-14">
        <GameIntro kind="verbal" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage className="items-start sm:px-14">
        <ResultPanel kind="verbal" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  return (
    <Stage tone={flash === "wrong" ? "alarm" : "deep"}>
      <Readout items={[{ label: "Score", value: score }, { label: "Lives", value: <Lives left={lives} total={VERBAL_LIVES} /> }]} />
      <p className="font-display text-[clamp(3rem,10vw,7rem)] leading-none text-ink" aria-live="polite">
        {word?.word}
      </p>
      <div className="mt-14 flex w-full max-w-md gap-3">
        <Button size="lg" variant="secondary" className="flex-1" onClick={() => void answer(true)}>
          Seen <span className="text-micro text-muted">S</span>
        </Button>
        <Button size="lg" className="flex-1" onClick={() => void answer(false)}>
          New <span className="text-micro opacity-70">N</span>
        </Button>
      </div>
    </Stage>
  );
}
