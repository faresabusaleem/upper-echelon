/**
 * Pure game mechanics shared by the client components and the tests. Randomness is injected so
 * every rule can be tested deterministically.
 */
export type Rng = () => number;

/** Deterministic PRNG for tests and reproducible layouts. */
export function mulberry32(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const randInt = (rng: Rng, min: number, max: number) => Math.floor(rng() * (max - min + 1)) + min;

export function mean(values: number[]): number {
  if (values.length === 0) return 0;
  return values.reduce((a, b) => a + b, 0) / values.length;
}

// ---------------------------------------------------------------------------------------------
// Reaction Time
// ---------------------------------------------------------------------------------------------
export const REACTION_ATTEMPTS = 5;
export const REACTION_MIN_WAIT = 1500;
export const REACTION_MAX_WAIT = 4500;
/** Faster than this is not a reaction but a guess. */
export const REACTION_FLOOR = 100;
/** Slower than this, the player looked away: the attempt is void and taken again. */
export const REACTION_CEILING = 5000;

export function reactionDelay(rng: Rng = Math.random): number {
  return randInt(rng, REACTION_MIN_WAIT, REACTION_MAX_WAIT);
}

export function reactionScore(times: number[]): number {
  return Math.round(mean(times));
}

// ---------------------------------------------------------------------------------------------
// Sequence Memory (3 × 3 grid)
// ---------------------------------------------------------------------------------------------
export const SEQUENCE_TILES = 9;
export const SEQUENCE_FLASH_MS = 420;
export const SEQUENCE_GAP_MS = 180;

export function extendSequence(seq: number[], rng: Rng = Math.random): number[] {
  return [...seq, randInt(rng, 0, SEQUENCE_TILES - 1)];
}

/** Checks one input against the sequence. Returns "continue", "complete" or "wrong". */
export function checkSequenceInput(seq: number[], inputs: number[]): "continue" | "complete" | "wrong" {
  const i = inputs.length - 1;
  if (i < 0) return "continue";
  if (inputs[i] !== seq[i]) return "wrong";
  return inputs.length === seq.length ? "complete" : "continue";
}

// ---------------------------------------------------------------------------------------------
// Aim Trainer
// ---------------------------------------------------------------------------------------------
export const AIM_TARGETS = 30;

/** A random target centre inside the field, kept clear of the edges and away from the previous one. */
export function aimTarget(
  width: number,
  height: number,
  radius: number,
  rng: Rng = Math.random,
  previous?: { x: number; y: number },
): { x: number; y: number } {
  const pad = radius + 6;
  for (let i = 0; i < 12; i++) {
    const x = pad + rng() * Math.max(1, width - 2 * pad);
    const y = pad + rng() * Math.max(1, height - 2 * pad);
    if (!previous || Math.hypot(x - previous.x, y - previous.y) > radius * 3) return { x, y };
  }
  return { x: width / 2, y: height / 2 };
}

// ---------------------------------------------------------------------------------------------
// Number Memory
// ---------------------------------------------------------------------------------------------
export function randomDigits(length: number, rng: Rng = Math.random): string {
  let s = String(randInt(rng, 1, 9));
  for (let i = 1; i < length; i++) s += String(randInt(rng, 0, 9));
  return s;
}

/** How long a number of `length` digits stays visible. */
export function numberDisplayMs(length: number): number {
  return 1200 + 500 * length;
}

// ---------------------------------------------------------------------------------------------
// Verbal Memory
// ---------------------------------------------------------------------------------------------
export const VERBAL_LIVES = 3;

/** Picks the next word. Early on, mostly new words; later, roughly even. Never the same twice in a row. */
export function nextVerbalWord(
  pool: readonly string[],
  seen: readonly string[],
  last: string | null,
  rng: Rng = Math.random,
): { word: string; isSeen: boolean } {
  const pSeen = seen.length < 3 ? 0 : Math.min(0.5, 0.25 + seen.length / 200);
  const seenChoices = seen.filter((w) => w !== last);
  if (seenChoices.length > 0 && rng() < pSeen) {
    return { word: seenChoices[randInt(rng, 0, seenChoices.length - 1)], isSeen: true };
  }
  const seenSet = new Set(seen);
  for (let i = 0; i < 50; i++) {
    const w = pool[randInt(rng, 0, pool.length - 1)];
    if (!seenSet.has(w)) return { word: w, isSeen: false };
  }
  const fresh = pool.find((w) => !seenSet.has(w));
  if (fresh) return { word: fresh, isSeen: false };
  return { word: seenChoices[0] ?? seen[0], isSeen: true };
}

// ---------------------------------------------------------------------------------------------
// Chimp Test (8 × 5 field)
// ---------------------------------------------------------------------------------------------
export const CHIMP_COLS = 8;
export const CHIMP_ROWS = 5;
export const CHIMP_START = 4;
export const CHIMP_STRIKES = 3;
export const CHIMP_MAX = CHIMP_COLS * CHIMP_ROWS;

/** Distinct cells for numbers 1..count. Returns cell indexes in number order. */
export function chimpLayout(count: number, rng: Rng = Math.random): number[] {
  const cells = Array.from({ length: CHIMP_MAX }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return cells.slice(0, Math.min(count, CHIMP_MAX));
}

// ---------------------------------------------------------------------------------------------
// Visual Memory
// ---------------------------------------------------------------------------------------------
export const VISUAL_LIVES = 3;
export const VISUAL_MISSES_PER_ROUND = 3;

/**
 * Visual Memory's pacing, in milliseconds. The game plays to these numbers, and the anti-cheat
 * minimum for a run (validate.ts) is derived from them, so the two can never drift apart.
 */
export const VISUAL_TIMING = {
  /** A new board settles in (tiles scale up, staggered) before the pattern shows. */
  enter: 420,
  /** A tile turning over, in either direction. */
  flip: 200,
  /** How long the pattern stays face up. */
  show: 1000,
  /** After the last correct tile: the board glows, then clears, then the next one enters. */
  clear: 700,
  /** After a life is lost: the missed pattern is shown before the round is replayed. */
  retry: 1100,
  /** The fastest plausible deliberate tap per tile, used only by the anti-cheat. */
  minTap: 90,
} as const;

/** The least time a level can take when played honestly (no clicking, perfect speed). */
export function visualMinimumLevelMs(level: number): number {
  const t = VISUAL_TIMING;
  return Math.round((t.enter + t.flip + t.show + t.flip + t.clear) * 0.85) + visualTileCount(level) * t.minTap;
}

export function visualGridSize(level: number): number {
  return Math.min(3 + Math.floor((Math.max(level, 1) - 1) / 3), 8);
}

export function visualTileCount(level: number): number {
  return Math.max(level, 1) + 2;
}

export function visualPattern(level: number, rng: Rng = Math.random): Set<number> {
  const size = visualGridSize(level);
  const cells = Array.from({ length: size * size }, (_, i) => i);
  for (let i = cells.length - 1; i > 0; i--) {
    const j = randInt(rng, 0, i);
    [cells[i], cells[j]] = [cells[j], cells[i]];
  }
  return new Set(cells.slice(0, Math.min(visualTileCount(level), cells.length)));
}

// ---------------------------------------------------------------------------------------------
// Typing
// ---------------------------------------------------------------------------------------------
export type TypingStats = { grossWpm: number; accuracy: number; netWpm: number };

/** Standard word = 5 characters. Net WPM = gross WPM × accuracy. */
export function typingStats(typed: number, correct: number, durationMs: number): TypingStats {
  if (typed <= 0 || durationMs <= 0) return { grossWpm: 0, accuracy: 0, netWpm: 0 };
  const minutes = durationMs / 60000;
  const grossWpm = typed / 5 / minutes;
  const accuracy = Math.min(1, Math.max(0, correct / typed));
  return {
    grossWpm: Math.round(grossWpm * 10) / 10,
    accuracy: Math.round(accuracy * 1000) / 1000,
    netWpm: Math.round(grossWpm * accuracy * 10) / 10,
  };
}

/** Counts correctly typed characters position by position against the target. */
export function typingCorrect(target: string, typed: string): number {
  let n = 0;
  for (let i = 0; i < typed.length && i < target.length; i++) if (typed[i] === target[i]) n++;
  return n;
}
