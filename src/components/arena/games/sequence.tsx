"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SEQUENCE_FLASH_MS, SEQUENCE_GAP_MS, checkSequenceInput, extendSequence } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { useArena } from "../fx";
import { GameIntro, Hud, Stage, tileClass } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

type Phase = "intro" | "showing" | "input" | "between" | "result";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export function SequenceGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("sequence", isMember);
  const { stageRef, fx } = useArena(GAME_THEMES.sequence.tint);
  const [phase, setPhase] = useState<Phase>("intro");
  const [seq, setSeq] = useState<number[]>([]);
  const [inputs, setInputs] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const [wrong, setWrong] = useState<number | null>(null);
  const [outcome, setOutcome] = useState<GameOutcome | null>(null);
  const alive = useRef(true);

  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
    };
  }, []);

  const play = useCallback(
    async (s: number[]) => {
      setPhase("showing");
      setInputs([]);
      await sleep(650);
      for (const tile of s) {
        if (!alive.current) return;
        setLit(tile);
        fx.tile(tile);
        await sleep(SEQUENCE_FLASH_MS);
        setLit(null);
        await sleep(SEQUENCE_GAP_MS);
      }
      if (alive.current) setPhase("input");
    },
    [fx],
  );

  const start = useCallback(async () => {
    setOutcome(null);
    setWrong(null);
    fx.start();
    await begin();
    const s = extendSequence([]);
    setSeq(s);
    void play(s);
  }, [begin, fx, play]);

  const press = useCallback(
    async (tile: number) => {
      if (phase !== "input") return;
      setPressed(tile);
      setTimeout(() => setPressed((p) => (p === tile ? null : p)), 180);
      const next = [...inputs, tile];
      setInputs(next);
      const verdict = checkSequenceInput(seq, next);
      if (verdict === "wrong") {
        setWrong(tile);
        fx.life();
        setPhase("between");
        await sleep(700);
        const o = await finish({ level: seq.length - 1 });
        setOutcome(o);
        setPhase("result");
        fx.end(o);
      } else if (verdict === "complete") {
        fx.tile(tile);
        setPhase("between");
        await sleep(260);
        fx.level();
        await sleep(450);
        const s = extendSequence(seq);
        setSeq(s);
        void play(s);
      } else {
        fx.tile(tile);
      }
    },
    [finish, fx, inputs, phase, play, seq],
  );

  useEffect(() => {
    if (phase !== "input") return;
    const onKey = (e: KeyboardEvent) => {
      const n = Number(e.key);
      if (n >= 1 && n <= 9 && !e.repeat) void press(n - 1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, press]);

  if (phase === "intro") {
    return (
      <Stage kind="sequence" ref={stageRef}>
        <GameIntro kind="sequence" onStart={start} />
      </Stage>
    );
  }
  if (phase === "result" && outcome) {
    return (
      <Stage kind="sequence" ref={stageRef}>
        <ResultPanel kind="sequence" outcome={outcome} onAgain={start} isMember={isMember} />
      </Stage>
    );
  }

  return (
    <Stage kind="sequence" ref={stageRef}>
      <Hud level={seq.length} items={[{ label: "Progress", value: phase === "input" ? `${inputs.length}/${seq.length}` : "·" }]} />
      <p className="absolute inset-x-0 top-24 text-center text-small text-white/60" aria-live="polite">
        {phase === "showing" ? "Watch." : phase === "input" ? "Your turn." : ""}
      </p>
      <div className="mt-6 grid w-full max-w-[min(24rem,78vw)] grid-cols-3 gap-3 sm:gap-3.5">
        {Array.from({ length: 9 }).map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Tile ${i + 1}`}
            disabled={phase !== "input"}
            onPointerDown={(e) => {
              e.preventDefault();
              void press(i);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                void press(i);
              }
            }}
            className={`aspect-square w-full ${tileClass(wrong === i ? "wrong" : lit === i || pressed === i ? "lit" : phase === "input" ? "idle" : "off")}`}
          />
        ))}
      </div>
    </Stage>
  );
}
