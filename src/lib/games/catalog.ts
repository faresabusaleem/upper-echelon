/**
 * The eight trials of the Arena. These are standard cognitive-psychology tasks; the copy, layout
 * and presentation are Upper Echelon's own.
 *
 * Ratings (0–100) map a score onto an editorial reference scale with piecewise-linear anchors.
 * They are not population norms; percentiles shown to members are computed live against members.
 */
export const GAME_KINDS = ["reaction", "sequence", "aim", "number", "verbal", "chimp", "visual", "typing"] as const;
export type GameKind = (typeof GAME_KINDS)[number];

export type GameMeta = {
  kind: GameKind;
  slug: string;
  name: string;
  /** One line, measured voice. */
  line: string;
  /** What the trial measures. */
  measures: string;
  /** How to play, in short imperative sentences. */
  rules: string[];
  unit: string;
  unitLong: string;
  lowerIsBetter: boolean;
  decimals: number;
  /** Score → rating anchors, sorted by score ascending. */
  anchors: Array<[number, number]>;
  /** Bounds of the distribution chart. */
  distribution: { lo: number; hi: number };
};

export const GAMES: Record<GameKind, GameMeta> = {
  reaction: {
    kind: "reaction",
    slug: "reaction-time",
    name: "Reaction Time",
    line: "Wait for gold. Then strike.",
    measures: "Simple visual reaction time: how quickly a signal becomes an action.",
    rules: [
      "Press start. The field darkens.",
      "When it turns gold, click, tap or press Space as fast as you can.",
      "Five attempts. Your score is the average.",
      "Move too early and the attempt is void, not counted.",
    ],
    unit: "ms",
    unitLong: "milliseconds",
    lowerIsBetter: true,
    decimals: 0,
    anchors: [
      [150, 100], [180, 92], [200, 85], [225, 72], [250, 58], [275, 45], [300, 34], [350, 20], [400, 10], [500, 0],
    ],
    distribution: { lo: 120, hi: 520 },
  },
  sequence: {
    kind: "sequence",
    slug: "sequence-memory",
    name: "Sequence Memory",
    line: "Follow the order. It only grows.",
    measures: "Visuospatial working memory for an ordered sequence.",
    rules: [
      "Tiles light one after another.",
      "Repeat the whole sequence in the same order.",
      "Each round adds one step. One mistake ends the trial.",
      "Keyboard: the tiles map to 1–9, left to right, top to bottom.",
    ],
    unit: "steps",
    unitLong: "steps remembered",
    lowerIsBetter: false,
    decimals: 0,
    anchors: [
      [0, 0], [3, 10], [5, 25], [7, 40], [9, 55], [11, 68], [13, 78], [15, 86], [18, 93], [22, 98], [26, 100],
    ],
    distribution: { lo: 0, hi: 30 },
  },
  aim: {
    kind: "aim",
    slug: "aim-trainer",
    name: "Aim Trainer",
    line: "Thirty marks. No hesitation.",
    measures: "Speed and precision of visually guided movement.",
    rules: [
      "A mark appears. Hit it.",
      "The next appears the moment you do.",
      "Thirty marks. Your score is the average time per mark.",
    ],
    unit: "ms",
    unitLong: "milliseconds per target",
    lowerIsBetter: true,
    decimals: 0,
    anchors: [[250, 100], [300, 94], [350, 85], [400, 74], [450, 62], [500, 50], [600, 32], [700, 18], [900, 0]],
    distribution: { lo: 200, hi: 1000 },
  },
  number: {
    kind: "number",
    slug: "number-memory",
    name: "Number Memory",
    line: "Hold a number. Then a longer one.",
    measures: "Verbal working memory span for digits.",
    rules: [
      "A number appears for a few seconds, then vanishes.",
      "Type it back exactly.",
      "Each success adds a digit. One mistake ends the trial.",
    ],
    unit: "digits",
    unitLong: "digits remembered",
    lowerIsBetter: false,
    decimals: 0,
    anchors: [[0, 0], [4, 10], [6, 25], [7, 40], [8, 52], [9, 63], [10, 72], [12, 85], [14, 92], [17, 98], [20, 100]],
    distribution: { lo: 0, hi: 24 },
  },
  verbal: {
    kind: "verbal",
    slug: "verbal-memory",
    name: "Verbal Memory",
    line: "Seen it before? Be certain.",
    measures: "Recognition memory for words over a long, growing list.",
    rules: [
      "Words appear one at a time.",
      "Answer Seen if it has appeared before in this trial, New if not.",
      "Three lives. Each wrong answer costs one.",
      "Keyboard: S for Seen, N for New.",
    ],
    unit: "words",
    unitLong: "correct answers",
    lowerIsBetter: false,
    decimals: 0,
    anchors: [[0, 0], [20, 10], [40, 28], [60, 45], [80, 58], [100, 68], [130, 80], [170, 90], [230, 97], [300, 100]],
    distribution: { lo: 0, hi: 320 },
  },
  chimp: {
    kind: "chimp",
    slug: "chimp-test",
    name: "Chimp Test",
    line: "Remember where. Then the order.",
    measures: "Rapid spatial memory for the positions of numbered items.",
    rules: [
      "Numbers appear across the field.",
      "Select 1. The others hide.",
      "Select the rest in ascending order from memory.",
      "Each success adds a number. Three strikes end the trial.",
    ],
    unit: "numbers",
    unitLong: "numbers in order",
    lowerIsBetter: false,
    decimals: 0,
    anchors: [[0, 0], [5, 10], [7, 22], [9, 38], [11, 52], [13, 64], [15, 75], [18, 86], [22, 94], [27, 99], [30, 100]],
    distribution: { lo: 4, hi: 36 },
  },
  visual: {
    kind: "visual",
    slug: "visual-memory",
    name: "Visual Memory",
    line: "A pattern flashes. Rebuild it.",
    measures: "Visual short-term memory for patterns in a growing grid.",
    rules: [
      "Some squares light up for a moment.",
      "Select every square that was lit.",
      "Three wrong squares in a round cost a life. Three lives in all.",
      "The grid grows as you climb.",
    ],
    unit: "level",
    unitLong: "level reached",
    lowerIsBetter: false,
    decimals: 0,
    anchors: [[0, 0], [3, 10], [5, 22], [7, 36], [9, 50], [11, 62], [13, 73], [15, 82], [18, 91], [22, 97], [26, 100]],
    distribution: { lo: 0, hi: 30 },
  },
  typing: {
    kind: "typing",
    slug: "typing",
    name: "Typing",
    line: "Speed is nothing without accuracy.",
    measures: "Typing speed in words per minute, adjusted for accuracy.",
    rules: [
      "Type the passage exactly as shown.",
      "The clock starts with your first key.",
      "Your score is net words per minute: speed multiplied by accuracy.",
    ],
    unit: "wpm",
    unitLong: "net words per minute",
    lowerIsBetter: false,
    decimals: 0,
    anchors: [[0, 0], [20, 8], [35, 22], [50, 40], [65, 55], [80, 68], [95, 79], [110, 87], [130, 94], [150, 98], [170, 100]],
    distribution: { lo: 0, hi: 180 },
  },
};

export const GAME_LIST: GameMeta[] = GAME_KINDS.map((k) => GAMES[k]);

export function gameBySlug(slug: string): GameMeta | undefined {
  return GAME_LIST.find((g) => g.slug === slug);
}

export function isGameKind(value: string): value is GameKind {
  return (GAME_KINDS as readonly string[]).includes(value);
}

export function formatScore(kind: GameKind, score: number): string {
  const g = GAMES[kind];
  return `${Number(score).toFixed(g.decimals)} ${g.unit}`;
}

/** Rating 0–100 from the game's anchors (piecewise linear, clamped). */
export function rateScore(kind: GameKind, score: number): number {
  const a = GAMES[kind].anchors;
  if (!Number.isFinite(score)) return 0;
  if (score <= a[0][0]) return a[0][1];
  if (score >= a[a.length - 1][0]) return a[a.length - 1][1];
  for (let i = 1; i < a.length; i++) {
    const [x1, y1] = a[i];
    const [x0, y0] = a[i - 1];
    if (score <= x1) return Math.round(y0 + ((score - x0) / (x1 - x0)) * (y1 - y0));
  }
  return 0;
}

/** True when `a` is a better score than `b` for this game. */
export function isBetter(kind: GameKind, a: number, b: number | null | undefined): boolean {
  if (b == null) return true;
  return GAMES[kind].lowerIsBetter ? a < b : a > b;
}

/** The game of the day (UTC). Mirrors public.daily_game() in the database. */
export function dailyGame(date = new Date()): GameKind {
  const day = Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
  const epoch = Date.UTC(2026, 0, 1);
  const diff = Math.round((day - epoch) / 86400000);
  return GAME_KINDS[((diff % 8) + 8) % 8];
}
