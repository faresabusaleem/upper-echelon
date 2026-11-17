"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { SEQUENCE_FLASH_MS, SEQUENCE_FLIP_MS, SEQUENCE_GAP_MS, checkSequenceInput, extendSequence } from "@/lib/games/engine";
import { GAME_THEMES } from "@/lib/games/themes";
import { useArena } from "../fx";
import { FlipTile, GameIntro, Hud, Prompt, Stage, type TileBack } from "../game-ui";
import { ResultPanel } from "../result-panel";
import { type GameOutcome, useGameSession } from "../use-game-session";

/**
 * Phases: enter (the board settles in) → showing (each step turns a tile up for SEQUENCE_FLASH_MS,
 * then down during SEQUENCE_GAP_MS) → input → clear (the board ripples) → showing again, one longer.
 * A wrong tile turns ember, the one that was due is outlined, and the trial ends.
 */
type Phase = "intro" | "enter" | "showing" | "input" | "clear" | "wrong" | "result";
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const ENTER_MS = 420;
const CLEAR_MS = 650;
const WRONG_MS = 1200;

export function SequenceGame({ isMember }: { isMember: boolean }) {
  const { begin, finish } = useGameSession("sequence", isMember);
  const { stageRef, fx } = useArena(GAME_THEMES.sequence.tint);
  const [phase, setPhase] = useState<Phase>("intro");
  const [seq, setSeq] = useState<number[]>([]);
  const [inputs, setInputs] = useState<number[]>([]);
  const [lit, setLit] = useState<number | null>(null);
  const [pressed, setPressed] = useState<number | null>(null);
  const [wrong, setWrong] = useState<{ pressed: number; due: number } | null>(null);
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
      await sleep(500);
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
    setLit(null);
    setPressed(null);
    setPhase("enter");
    fx.start();
    await begin();
    await sleep(ENTER_MS);
    const s = extendSequence([]);
    setSeq(s);
    void play(s);
  }, [begin, fx, play]);

  const press = useCallback(
    async (tile: number) => {
      if (phase !== "input") return;
      const next = [...inputs, tile];
      setInputs(next);
      const verdict = checkSequenceInput(seq, next);
      if (verdict === "wrong") {
        setWrong({ pressed: tile, due: seq[next.length - 1] });
        setPhase("wrong");
        fx.life();
        await sleep(WRONG_MS);
        const o = await finish({ level: seq.length - 1 });
        setOutcome(o);
        setPhase("result");
        fx.end(o);
        return;
      }
      fx.tile(tile);
      setPressed(tile);
      setTimeout(() => setPressed((p) => (p === tile ? null : p)), SEQUENCE_FLIP_MS + 120);
      if (verdict === "complete") {
        setPhase("clear");
        await sleep(SEQUENCE_FLIP_MS + 80);
        fx.level();
        await sleep(CLEAR_MS);
        const s = extendSequence(seq);
        setSeq(s);
        void play(s);
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

  const faceOf = (i: number): { up: boolean; back: TileBack } => {
    if (wrong?.pressed === i) return { up: true, back: "wrong" };
    if (wrong?.due === i) return { up: true, back: "missed" };
    if (lit === i || pressed === i) return { up: true, back: "lit" };
    return { up: false, back: "lit" };
  };
  return (
    <Stage kind="sequence" ref={stageRef}>
      <Hud level={Math.max(seq.length, 1)} items={[{ label: "Progress", value: phase === "input" ? `${inputs.length}/${seq.length}` : "·" }]} />
      <Prompt>
        {phase === "showing" ? "Watch." : phase === "input" ? "Your turn." : phase === "clear" ? "Level complete." : phase === "wrong" ? "Wrong tile." : ""}
      </Prompt>
      <div className="grid w-full max-w-[min(24rem,78vw)] grid-cols-3 gap-2.5 sm:gap-3">
        {Array.from({ length: 9 }).map((_, i) => {
          const f = faceOf(i);
          return (
            <FlipTile
              key={i}
              index={i}
              label={`Tile ${i + 1}`}
              up={f.up}
              back={f.back}
              flipMs={SEQUENCE_FLIP_MS}
              entering={phase === "enter"}
              winning={phase === "clear"}
              disabled={phase !== "input"}
              onPress={() => void press(i)}
            />
          );
        })}
      </div>
    </Stage>
  );
}
