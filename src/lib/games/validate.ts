import { z } from "zod";
import { GAMES, type GameKind, rateScore } from "./catalog";
import {
  AIM_TARGETS,
  CHIMP_MAX,
  CHIMP_START,
  REACTION_ATTEMPTS,
  REACTION_FLOOR,
  REACTION_MIN_WAIT,
  SEQUENCE_FLASH_MS,
  SEQUENCE_GAP_MS,
  numberDisplayMs,
  reactionScore,
  typingStats,
  visualTileCount,
  mean,
} from "./engine";
import { passageById } from "./passages";

/**
 * Server-side anti-cheat. The client sends raw observations (not a score); the server recomputes
 * the score, checks the payload against the rules of the game and against the wall-clock time that
 * passed since the server issued the session. Results that are impossible are rejected; results that
 * are merely implausible are stored but flagged, excluded from leaderboards and shown to moderators.
 */
export type Evaluation =
  | { ok: true; score: number; rating: number; flagged: boolean; reason: string | null; details: Record<string, unknown> }
  | { ok: false; error: string };

const ms = z.number().finite().min(0).max(60_000);

export const detailSchemas = {
  reaction: z.object({ times: z.array(ms.max(5000)).length(REACTION_ATTEMPTS) }),
  sequence: z.object({ level: z.number().int().min(0).max(500) }),
  aim: z.object({ times: z.array(ms.max(15_000)).length(AIM_TARGETS) }),
  number: z.object({ digits: z.number().int().min(0).max(200) }),
  verbal: z.object({ score: z.number().int().min(0).max(20_000) }),
  chimp: z.object({ numbers: z.number().int().min(0).max(CHIMP_MAX) }),
  visual: z.object({ level: z.number().int().min(0).max(500) }),
  typing: z.object({
    passageId: z.string().min(1).max(10),
    typed: z.number().int().min(1).max(5000),
    correct: z.number().int().min(0).max(5000),
    durationMs: z.number().int().min(1).max(30 * 60_000),
  }),
} satisfies Record<GameKind, z.ZodType>;

/** Upper bounds beyond which a score is considered implausible for a human (flagged, not rejected). */
export const PLAUSIBLE = {
  reaction: { minScore: 120, minSingle: REACTION_FLOOR },
  aim: { minScore: 170, minSingle: 90 },
  sequence: { maxScore: 60 },
  number: { maxScore: 40 },
  verbal: { maxScore: 1500 },
  chimp: { maxScore: CHIMP_MAX },
  visual: { maxScore: 45 },
  typing: { maxScore: 220 },
} as const;

/** Minimum wall-clock time a trial must take to produce a given result. */
export function minimumDurationMs(kind: GameKind, details: Record<string, unknown>): number {
  switch (kind) {
    case "reaction": {
      const times = details.times as number[];
      return times.reduce((a, b) => a + b, 0) + REACTION_ATTEMPTS * REACTION_MIN_WAIT;
    }
    case "aim":
      return (details.times as number[]).reduce((a, b) => a + b, 0);
    case "sequence": {
      const l = details.level as number;
      // Every round replays the whole sequence and then waits for as many inputs.
      return ((SEQUENCE_FLASH_MS + SEQUENCE_GAP_MS + 120) * l * (l + 1)) / 2;
    }
    case "number": {
      const d = details.digits as number;
      let total = 0;
      for (let n = 1; n <= d; n++) total += numberDisplayMs(n);
      return total;
    }
    case "verbal":
      return (details.score as number) * 250;
    case "chimp": {
      const n = details.numbers as number;
      let total = 0;
      for (let k = CHIMP_START; k <= n; k++) total += k * 120;
      return total;
    }
    case "visual": {
      const l = details.level as number;
      let total = 0;
      for (let k = 1; k <= l; k++) total += 1400 + visualTileCount(k) * 120;
      return total;
    }
    case "typing":
      return (details.durationMs as number) * 0.9;
  }
}

export function evaluate(kind: GameKind, raw: unknown, elapsedMs: number): Evaluation {
  const parsed = detailSchemas[kind].safeParse(raw);
  if (!parsed.success) return { ok: false, error: "The result is malformed." };
  const details = parsed.data as Record<string, unknown>;

  let score: number;
  const reasons: string[] = [];
  const extra: Record<string, unknown> = {};

  switch (kind) {
    case "reaction": {
      const times = details.times as number[];
      score = reactionScore(times);
      if (score < PLAUSIBLE.reaction.minScore) reasons.push("average below human floor");
      if (times.some((t) => t < PLAUSIBLE.reaction.minSingle)) reasons.push("an attempt faster than 100 ms");
      break;
    }
    case "aim": {
      const times = details.times as number[];
      score = Math.round(mean(times));
      if (score < PLAUSIBLE.aim.minScore) reasons.push("average below human floor");
      if (times.filter((t) => t < PLAUSIBLE.aim.minSingle).length > 3) reasons.push("several hits faster than 90 ms");
      break;
    }
    case "sequence":
      score = details.level as number;
      if (score > PLAUSIBLE.sequence.maxScore) reasons.push("sequence longer than plausible");
      break;
    case "number":
      score = details.digits as number;
      if (score > PLAUSIBLE.number.maxScore) reasons.push("span longer than plausible");
      break;
    case "verbal":
      score = details.score as number;
      if (score > PLAUSIBLE.verbal.maxScore) reasons.push("run longer than plausible");
      break;
    case "chimp":
      score = details.numbers as number;
      break;
    case "visual":
      score = details.level as number;
      if (score > PLAUSIBLE.visual.maxScore) reasons.push("level higher than plausible");
      break;
    case "typing": {
      const passage = passageById(details.passageId as string);
      if (!passage) return { ok: false, error: "Unknown passage." };
      const typed = details.typed as number;
      const correct = details.correct as number;
      if (correct > typed || typed > passage.text.length + 20) return { ok: false, error: "The result is inconsistent." };
      if (typed < Math.min(40, passage.text.length)) return { ok: false, error: "Type more of the passage to score." };
      const stats = typingStats(typed, correct, details.durationMs as number);
      score = Math.round(stats.netWpm);
      extra.grossWpm = stats.grossWpm;
      extra.accuracy = stats.accuracy;
      if (score > PLAUSIBLE.typing.maxScore) reasons.push("speed beyond plausible");
      if (typed / ((details.durationMs as number) / 1000) > 25) reasons.push("more than 25 keys per second");
      break;
    }
  }

  const min = minimumDurationMs(kind, details);
  if (elapsedMs + 750 < min) reasons.push("finished faster than the trial can run");

  return {
    ok: true,
    score,
    rating: rateScore(kind, score),
    flagged: reasons.length > 0,
    reason: reasons.length ? reasons.join("; ") : null,
    details: { ...details, ...extra },
  };
}

/** The unit-bearing label of a score for this game, e.g. "231 ms". */
export function describe(kind: GameKind, score: number) {
  return `${score.toFixed(GAMES[kind].decimals)} ${GAMES[kind].unit}`;
}
